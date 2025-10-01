/**
 * Auth layout - minimal layout for authentication pages
 *
 * This provides a clean, centered layout for login/register/reset pages
 * without the main application navigation.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
}
