/**
 * In-memory draft storage for Trip Planner
 * Keeps form/result/remix drafts in module memory (not persisted to localStorage)
 */

const state = {
  form: null,
  result: null,
  remix: null
};

export const setFormDraft = (data) => {
  state.form = data ?? null;
};

export const getFormDraft = () => state.form;

export const clearFormDraft = () => {
  state.form = null;
};

export const setResultDraft = (data) => {
  state.result = data ?? null;
};

export const getResultDraft = () => state.result;

export const clearResultDraft = () => {
  state.result = null;
};

export const setRemixDraft = (data) => {
  state.remix = data ?? null;
};

export const getRemixDraft = () => state.remix;

export const clearRemixDraft = () => {
  state.remix = null;
};

export const clearAllDrafts = () => {
  state.form = null;
  state.result = null;
  state.remix = null;
};

export default {
  setFormDraft,
  getFormDraft,
  clearFormDraft,
  setResultDraft,
  getResultDraft,
  clearResultDraft,
  setRemixDraft,
  getRemixDraft,
  clearRemixDraft,
  clearAllDrafts
};
