import Navbar from "../Components/navbar/Navbar";
import Footer from "../Components/footer/Footer";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <Navbar />
      <main>{children}</main>

      <Footer />
    </div>
  );
}
