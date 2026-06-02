import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  Card,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Tag,
  Table,
  List,
  Statistic,
  Empty,
  Popconfirm,
  Space,
  Typography,
  Divider,
  message,
  Spin,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import {
  fetchTripExpenses,
  createTripExpense,
  deleteTripExpense,
  toggleExpenseSettled,
} from "@/api/expenses";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationsContext";
import { fetchFriends } from "@/api/social";

const { Text, Title } = Typography;

const normalizeUser = (u) => ({
  id: u?.id ?? u?.userId ?? "",
  name:
    [u?.firstName, u?.lastName].filter(Boolean).join(" ") ||
    u?.username ||
    u?.id?.slice(0, 8) ||
    "Unknown",
  avatarUrl: u?.avatarUrl ?? null,
});

const calculateLedger = (expenses) => {
  const balances = {};

  for (const expense of expenses) {
    if (expense.isSettled) continue;
    const total = Number(expense.totalAmount);
    const people = expense.splitAmongUserIds ?? [];
    if (people.length === 0) continue;
    const share = total / people.length;

    for (const userId of people) {
      if (!balances[userId]) balances[userId] = 0;
      if (userId === expense.paidById) {
        balances[userId] += total - share;
      } else {
        balances[userId] -= share;
      }
    }
  }

  for (const id of Object.keys(balances)) {
    balances[id] = Math.round(balances[id] * 100) / 100;
  }

  const creditors = Object.entries(balances)
    .filter(([, v]) => v > 0.01)
    .sort(([, a], [, b]) => b - a);
  const debtors = Object.entries(balances)
    .filter(([, v]) => v < -0.01)
    .sort(([, a], [, b]) => a - b);

  const settlements = [];
  let ci = 0;
  let di = 0;
  const credCopy = creditors.map(([id, v]) => [id, v]);
  const debtCopy = debtors.map(([id, v]) => [id, v]);

  while (ci < credCopy.length && di < debtCopy.length) {
    const [credId, credAmount] = credCopy[ci];
    const [debId, debAmount] = debtCopy[di];
    const amount = Math.min(credAmount, -debAmount);
    const rounded = Math.round(amount * 100) / 100;
    if (rounded > 0) {
      settlements.push({ fromUserId: debId, toUserId: credId, amount: rounded });
    }
    credCopy[ci][1] = Math.round((credCopy[ci][1] - amount) * 100) / 100;
    debtCopy[di][1] = Math.round((debtCopy[di][1] + amount) * 100) / 100;
    if (Math.abs(credCopy[ci][1]) < 0.01) ci++;
    if (Math.abs(debtCopy[di][1]) < 0.01) di++;
  }

  return { balances, settlements };
};

const CURRENCY_OPTIONS = [
  { value: "ILS", label: "₪ ILS" },
  { value: "USD", label: "$ USD" },
  { value: "EUR", label: "€ EUR" },
  { value: "GBP", label: "£ GBP" },
];

const CATEGORY_OPTIONS = [
  { value: "food", label: "Food & Drinks" },
  { value: "transport", label: "Transport" },
  { value: "accommodation", label: "Accommodation" },
  { value: "activities", label: "Activities" },
  { value: "shopping", label: "Shopping" },
  { value: "other", label: "Other" },
];

export const ExpenseDashboard = ({ tripPlanId }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const currentUserId = user?.id ?? user?.userId ?? null;
  const { createExpense: emitCreateExpense, deleteExpense: emitDeleteExpense } =
    useNotifications();

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const fetchedRef = useRef(false);

  const userMap = useMemo(() => {
    const map = new Map();
    for (const f of friends) {
      const n = normalizeUser(f);
      map.set(n.id, n);
    }
    if (currentUserId) {
      map.set(currentUserId, normalizeUser(user));
    }
    for (const exp of expenses) {
      if (exp.paidBy) map.set(exp.paidBy.id, normalizeUser(exp.paidBy));
      for (const uid of exp.splitAmongUserIds ?? []) {
        if (!map.has(uid)) {
          map.set(uid, { id: uid, name: uid.slice(0, 8), avatarUrl: null });
        }
      }
    }
    return map;
  }, [friends, currentUserId, user, expenses]);

  const userName = useCallback(
    (id) => userMap.get(id)?.name ?? id?.slice(0, 8) ?? id,
    [userMap],
  );

  const loadExpenses = useCallback(async () => {
    if (!tripPlanId) return;
    try {
      const data = await fetchTripExpenses(tripPlanId);
      setExpenses(Array.isArray(data) ? data : []);
    } catch {
      message.error(t("toasts.expenses.failedToLoad"));
    } finally {
      setLoading(false);
    }
  }, [tripPlanId]);

  const loadFriends = useCallback(async () => {
    try {
      const data = await fetchFriends();
      setFriends(Array.isArray(data) ? data : []);
    } catch {}
  }, []);

  useEffect(() => {
    if (!tripPlanId || fetchedRef.current) return;
    fetchedRef.current = true;
    setLoading(true);
    Promise.all([loadExpenses(), loadFriends()]);
  }, [tripPlanId, loadExpenses, loadFriends]);

  useEffect(() => {
    if (!tripPlanId) return;
    const handler = (event) => {
      const payload = event?.detail;
      if (!payload) return;
      if (payload.type === "created" && payload.expense) {
        setExpenses((prev) => {
          const exists = prev.some((e) => e.id === payload.expense.id);
          return exists ? prev : [payload.expense, ...prev];
        });
      } else if (payload.type === "deleted" && payload.expenseId) {
        setExpenses((prev) => prev.filter((e) => e.id !== payload.expenseId));
      }
    };
    window.addEventListener("expense:updated", handler);
    return () => window.removeEventListener("expense:updated", handler);
  }, [tripPlanId]);

  const handleAddExpense = async (values) => {
    if (!tripPlanId || !currentUserId) return;
    setSubmitting(true);
    try {
      const expense = await createTripExpense(tripPlanId, {
        description: values.description,
        totalAmount: values.totalAmount,
        currencyCode: values.currencyCode || "ILS",
        date: values.date ? values.date.toISOString().slice(0, 10) : undefined,
        category: values.category || null,
        splitAmongUserIds: values.splitAmongUserIds,
      });
      emitCreateExpense({ tripPlanId, expense });
      setExpenses((prev) => [expense, ...prev]);
      form.resetFields();
      setAddModalOpen(false);
      message.success(t("toasts.expenses.added"));
    } catch {
      message.error(t("toasts.expenses.failedToAdd"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (expenseId) => {
    if (!tripPlanId) return;
    try {
      await deleteTripExpense(expenseId);
      emitDeleteExpense(tripPlanId, expenseId);
      setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
    } catch {
      message.error(t("toasts.expenses.failedToDelete"));
    }
  };

  const handleToggleSettled = async (expenseId) => {
    try {
      const updated = await toggleExpenseSettled(expenseId);
      setExpenses((prev) =>
        prev.map((e) => (e.id === expenseId ? { ...e, ...updated } : e)),
      );
    } catch {
      message.error(t("toasts.expenses.failedToUpdate"));
    }
  };

  const { balances, settlements } = useMemo(
    () => calculateLedger(expenses),
    [expenses],
  );

  const totalSpent = useMemo(
    () =>
      expenses.reduce(
        (sum, e) => sum + (e.isSettled ? 0 : Number(e.totalAmount)),
        0,
      ),
    [expenses],
  );

  const columns = [
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          {record.category && <Tag>{record.category}</Tag>}
        </Space>
      ),
    },
    {
      title: "Amount",
      dataIndex: "totalAmount",
      key: "amount",
      width: 120,
      render: (val, record) => (
        <Text strong>
          {Number(val).toFixed(2)} {record.currencyCode || "ILS"}
        </Text>
      ),
    },
    {
      title: "Paid By",
      dataIndex: "paidBy",
      key: "paidBy",
      width: 140,
      render: (paidBy) => (
        <Text>{paidBy ? normalizeUser(paidBy).name : "Unknown"}</Text>
      ),
    },
    {
      title: "Split",
      key: "split",
      width: 160,
      render: (_, record) => {
        const ids = record.splitAmongUserIds ?? [];
        return (
          <Text type="secondary">
            {ids.length} person{ids.length !== 1 ? "s" : ""} ·{" "}
            {ids.length > 0
              ? (Number(record.totalAmount) / ids.length).toFixed(2)
              : "0.00"}{" "}
            each
          </Text>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "isSettled",
      key: "status",
      width: 100,
      render: (settled) =>
        settled ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            Settled
          </Tag>
        ) : (
          <Tag color="warning">Pending</Tag>
        ),
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      width: 100,
      render: (d) => (d ? dayjs(d).format("MMM D") : "-"),
    },
    ...(currentUserId
      ? [
          {
            title: "Actions",
            key: "actions",
            width: 100,
            render: (_, record) => (
              <Space>
                {record.paidById === currentUserId && (
                  <>
                    <Popconfirm
                      title="Delete this expense?"
                      onConfirm={() => handleDelete(record.id)}
                    >
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                      />
                    </Popconfirm>
                    <Button
                      type="text"
                      size="small"
                      onClick={() => handleToggleSettled(record.id)}
                    >
                      {record.isSettled ? "Reopen" : "Settle"}
                    </Button>
                  </>
                )}
              </Space>
            ),
          },
        ]
      : []),
  ];

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 0" }}>
      <Card>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <Title level={4} style={{ margin: 0 }}>
              <DollarOutlined style={{ marginRight: 8 }} />
              Expense Dashboard
            </Title>
            <Text type="secondary" style={{ marginTop: 4, display: "block" }}>
              Track shared expenses and who owes whom
            </Text>
          </div>
          <Space size="large">
            <Statistic
              title="Total Unsettled"
              value={totalSpent.toFixed(2)}
              prefix="₪"
              suffix="ILS"
              styles={{ content: { fontSize: 18 } }}
            />
            <Statistic
              title="Expenses"
              value={expenses.length}
              prefix={<TeamOutlined />}
              styles={{ content: { fontSize: 18 } }}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setAddModalOpen(true)}
            >
              Add Expense
            </Button>
          </Space>
        </div>
      </Card>

      {settlements.length > 0 && (
        <Card
          size="small"
          style={{ marginTop: 12 }}
          title="Settlements"
        >
          <List
            size="small"
            dataSource={settlements}
            renderItem={(item) => (
              <List.Item>
                <Text>
                  <Text strong>{userName(item.fromUserId)}</Text>{" "}
                  should pay{" "}
                  <Text strong>{userName(item.toUserId)}</Text>{" "}
                  <Text strong type="danger">
                    ₪{item.amount.toFixed(2)}
                  </Text>
                </Text>
              </List.Item>
            )}
          />
        </Card>
      )}

      {balances && Object.keys(balances).length > 0 && (
        <Card
          size="small"
          style={{ marginTop: 12 }}
          title="Balances"
        >
          <Space wrap>
            {Object.entries(balances).map(([userId, balance]) => (
              <Tag
                key={userId}
                color={balance > 0 ? "green" : balance < 0 ? "red" : "default"}
              >
                {userName(userId)}:{" "}
                {balance > 0 ? "+" : ""}
                ₪{balance.toFixed(2)}
              </Tag>
            ))}
          </Space>
        </Card>
      )}

      <Divider />

      <Table
        dataSource={expenses}
        columns={columns}
        rowKey="id"
        pagination={false}
        size="middle"
        locale={{ emptyText: <Empty description="No expenses yet" /> }}
      />

      <Modal
        title="Add Expense"
        open={addModalOpen}
        onCancel={() => {
          form.resetFields();
          setAddModalOpen(false);
        }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddExpense}
          initialValues={{ currencyCode: "ILS" }}
        >
          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: "Enter a description" }]}
          >
            <Input placeholder="e.g. Dinner at restaurant" />
          </Form.Item>

          <Space style={{ width: "100%" }} align="start">
            <Form.Item
              name="totalAmount"
              label="Total Amount"
              rules={[{ required: true, message: "Enter amount" }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                min={0}
                step={0.01}
                style={{ width: "100%" }}
                placeholder="0.00"
              />
            </Form.Item>

            <Form.Item name="currencyCode" label="Currency">
              <Select style={{ width: 100 }} options={CURRENCY_OPTIONS} />
            </Form.Item>

            <Form.Item name="date" label="Date">
              <DatePicker />
            </Form.Item>
          </Space>

          <Form.Item name="category" label="Category">
            <Select
              allowClear
              placeholder="Select category"
              options={CATEGORY_OPTIONS}
            />
          </Form.Item>

          <Form.Item
            name="splitAmongUserIds"
            label="Split Among"
            rules={[
              { required: true, message: "Select at least one person" },
              { min: 1, type: "array", message: "Select at least one person" },
            ]}
          >
            <Select
              mode="multiple"
              placeholder="Select people to split with"
              style={{ width: "100%" }}
              options={[
                ...(currentUserId
                  ? [
                      {
                        value: currentUserId,
                        label: `${userName(currentUserId)} (you)`,
                      },
                    ]
                  : []),
                ...friends.map((f) => {
                  const n = normalizeUser(f);
                  return { value: n.id, label: n.name };
                }),
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
