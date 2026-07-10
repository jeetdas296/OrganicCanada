import { defineRouteConfig } from "@medusajs/admin-sdk"
import { UsersSolid } from "@medusajs/icons"
import { Container, Heading, Table, Button, Badge, toast, Input, Label, Select } from "@medusajs/ui"
import { useEffect, useState } from "react"

type PosUser = {
  id: string
  email: string
  full_name: string
  role: string
  active: boolean
  store_location_id: string | null
  sales_channel_id: string | null
  created_at: string
}

export default function PosUsersPage() {
  const [users, setUsers] = useState<PosUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [role, setRole] = useState("cashier")
  const [active, setActive] = useState("true")

  const [isVendor, setIsVendor] = useState(false)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      // First check if vendor
      const roleRes = await fetch("/admin/me/role")
      const roleData = await roleRes.json()
      if (roleData.role === "vendor") {
        setIsVendor(true)
        setLoading(false)
        return
      }

      const res = await fetch("/admin/pos-users")
      const data = await res.json()
      setUsers(data.pos_users || [])
    } catch {
      toast.error("Failed to load POS users.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // ... (keeping other handlers the same)
  // Re-declare handlers to not break scope
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch("/admin/pos-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, full_name: fullName, role, active: active === "true" }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.message || "Failed to create user.")
        return
      }
      toast.success("POS User created successfully!")
      setShowCreate(false)
      setEmail(""); setPassword(""); setFullName("")
      fetchUsers()
    } catch {
      toast.error("Failed to create POS user.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/admin/pos-users/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !currentStatus }) })
      if (!res.ok) throw new Error()
      toast.success(currentStatus ? "User deactivated" : "User activated")
      fetchUsers()
    } catch { toast.error("Failed to update status") }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return
    try {
      const res = await fetch(`/admin/pos-users/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("User deleted")
      fetchUsers()
    } catch { toast.error("Failed to delete user") }
  }

  if (isVendor) {
    return (
      <Container className="p-8 text-center">
        <Heading className="text-red-600 mb-2">Access Denied</Heading>
        <p className="text-ui-fg-muted">You do not have permission to view this page.</p>
      </Container>
    )
  }

  return (
    <Container className="p-8">
      <div className="flex items-center justify-between mb-6">
        <Heading>POS Users Management</Heading>
        <Button variant="secondary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "Cancel" : "Create POS User"}
        </Button>
      </div>

      {showCreate && (
        <div className="mb-8 p-6 border rounded-lg bg-ui-bg-subtle border-ui-border-base">
          <Heading level="h2" className="mb-4 text-lg">New POS User</Heading>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <div>
              <Label>Email</Label>
              <Input required type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <Label>Password</Label>
              <Input required type="password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div>
              <Label>Full Name</Label>
              <Input required value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>
            <div>
              <Label>Role</Label>
              <select 
                className="w-full h-8 px-2 border rounded-md" 
                value={role} 
                onChange={e => setRole(e.target.value)}
              >
                <option value="cashier">Cashier</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            <div className="col-span-2 mt-4 text-right">
              <Button type="submit" isLoading={submitting}>Save POS User</Button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p className="text-ui-fg-muted">Loading POS users...</p>
      ) : users.length === 0 ? (
        <div className="py-8 text-center border rounded-lg border-ui-border-base bg-ui-bg-subtle">
          <p className="text-ui-fg-subtle">No POS users found. Create one to get started.</p>
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Full Name</Table.HeaderCell>
              <Table.HeaderCell>Email</Table.HeaderCell>
              <Table.HeaderCell>Role</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {users.map((user) => (
              <Table.Row key={user.id}>
                <Table.Cell className="font-medium">{user.full_name}</Table.Cell>
                <Table.Cell className="text-ui-fg-muted">{user.email}</Table.Cell>
                <Table.Cell className="text-ui-fg-muted capitalize">{user.role}</Table.Cell>
                <Table.Cell>
                  <Badge color={user.active ? "green" : "red"}>
                    {user.active ? "Active" : "Inactive"}
                  </Badge>
                </Table.Cell>
                <Table.Cell className="text-right space-x-2">
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => handleToggleStatus(user.id, user.active)}
                  >
                    {user.active ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    variant="danger"
                    size="small"
                    onClick={() => handleDelete(user.id)}
                  >
                    Delete
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}
export const config = defineRouteConfig({
  label: "POS Users",
  icon: UsersSolid,
})
