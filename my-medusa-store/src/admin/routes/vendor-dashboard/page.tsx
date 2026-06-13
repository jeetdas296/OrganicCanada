import { defineRouteConfig } from "@medusajs/admin-sdk"
import { BuildingStorefront, CurrencyDollar, ShoppingCart, Tag } from "@medusajs/icons"
import { useState, useEffect } from "react"
import { Container, Heading, Text, Table, Badge } from "@medusajs/ui"

const VendorDashboard = () => {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [myFarm, setMyFarm] = useState<any>(null)
  
  const [vendors, setVendors] = useState<any[]>([])
  const [selectedVendor, setSelectedVendor] = useState("all")
  
  const [allOrders, setAllOrders] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const PLATFORM_FEE_PERCENTAGE = 0.15; // 15%

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        // 1. Identify Role
        const checkRes = await fetch("/admin/vendor-check")
        const checkData = await checkRes.json()
        const isAdmin = !checkData.is_vendor

        setIsSuperAdmin(isAdmin)
        setMyFarm(checkData.vendor)

        // 2. Fetch required data concurrently
        const fetchPromises: Promise<any>[] = [
          // Fetch Orders (with their items)
          fetch("/admin/orders?limit=100&order=-created_at&fields=id,display_id,created_at,email,payment_status,total,*items").then(r => r.json()),
          // Fetch Products (to map items to vendors)
          fetch("/admin/products?limit=1000&fields=id,*vendor").then(r => r.json())
        ]

        // Only fetch the vendors list if it's the Super Admin
        if (isAdmin) {
          fetchPromises.push(fetch("/admin/vendors").then(r => r.json()))
        }

        const results = await Promise.all(fetchPromises)
        
        setAllOrders(results[0]?.orders || [])
        setProducts(results[1]?.products || [])
        
        if (isAdmin && results[2]) {
          setVendors(results[2].vendors || [])
        }

      } catch (err) {
        console.error("Failed to load dashboard data", err)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  if (loading) {
    return <Container className="p-8 text-center">Loading Marketplace Data...</Container>
  }
// --------------------------------------------------------
  // 🟢 INTELLIGENT FILTERING ENGINE (Upgraded)
  // --------------------------------------------------------
  
  // 1. Who are we looking at?
  const targetVendorId = isSuperAdmin ? (selectedVendor === "all" ? null : selectedVendor) : myFarm?.id;

  // 2. Which products belong to the target?
  // 🟢 FIX: If "all" is selected, ONLY grab products that have a vendor attached! 
  // This excludes the Super Admin's native retail products.
  const targetProductIds = targetVendorId 
    ? products.filter(p => p.vendor?.id === targetVendorId).map(p => p.id)
    : products.filter(p => p.vendor && p.vendor.id).map(p => p.id); 

  // 3. Filter orders to only show ones containing target products
  const displayOrders = allOrders.filter(order => 
    order.items?.some((item: any) => targetProductIds.includes(item.product_id))
  );

  // 4. Calculate exact Gross Sales (Sum only the specific items belonging to the target!)
  let grossSales = 0;
  displayOrders.forEach(order => {
    order.items?.forEach((item: any) => {
      if (targetProductIds.includes(item.product_id)) {
        grossSales += (item.unit_price * item.quantity);
      }
    })
  });

  const netEarnings = grossSales - (grossSales * PLATFORM_FEE_PERCENTAGE);

  return (
    <Container className="p-8">
      {/* Header */}
      <Heading level="h1" className="mb-6 text-3xl">
        {isSuperAdmin ? "Master Marketplace Dashboard" : `Welcome to ${myFarm?.name || "Your Farm"}`}
      </Heading>

      {/* 🟢 SUPER ADMIN VENDOR SELECTOR */}
      {isSuperAdmin && (
        <div className="mb-8 p-4 bg-ui-bg-subtle border rounded-lg">
          <Text className="mb-2 font-medium">View Data For:</Text>
          <select 
            className="w-full max-w-md p-2 border rounded-md bg-ui-bg-base"
            value={selectedVendor} 
            onChange={(e) => setSelectedVendor(e.target.value)}
          >
            <option value="all">All Farms (Storewide)</option>
            {vendors.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* 🟢 STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="p-6 border rounded-lg shadow-sm bg-ui-bg-base flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-full"><ShoppingCart /></div>
          <div>
            <Text className="text-ui-fg-muted font-medium mb-1">Total Orders</Text>
            <Heading level="h2" className="text-2xl">{displayOrders.length}</Heading>
          </div>
        </div>

        <div className="p-6 border rounded-lg shadow-sm bg-ui-bg-base flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-full"><CurrencyDollar /></div>
          <div>
            <Text className="text-ui-fg-muted font-medium mb-1">Gross Sales</Text>
            <Heading level="h2" className="text-2xl">${grossSales.toFixed(2)}</Heading>
          </div>
        </div>

        <div className="p-6 border rounded-lg shadow-sm bg-ui-bg-base flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-full"><Tag /></div>
          <div>
            <Text className="text-ui-fg-muted font-medium mb-1">Net Payout (-15% Fee)</Text>
            <Heading level="h2" className="text-2xl text-purple-700">${netEarnings.toFixed(2)}</Heading>
          </div>
        </div>
      </div>

      {/* 🟢 RECENT ORDERS TABLE */}
      <Heading level="h2" className="mb-4 text-xl">Recent Orders</Heading>
      
      {displayOrders.length === 0 ? (
        <div className="p-8 border border-dashed rounded-lg text-center text-ui-fg-subtle">
          <Text>No orders received yet. Sales will appear here.</Text>
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Order ID</Table.HeaderCell>
              <Table.HeaderCell>Date</Table.HeaderCell>
              <Table.HeaderCell>Customer</Table.HeaderCell>
              <Table.HeaderCell>Payment Status</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Order Subtotal</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {displayOrders.map((order) => {
              
              // 🟢 Calculate this specific order's subtotal for the target vendor
              let orderVendorTotal = 0;
              order.items?.forEach((item: any) => {
                if (targetProductIds.includes(item.product_id)) {
                  orderVendorTotal += (item.unit_price * item.quantity);
                }
              })

              return (
                <Table.Row key={order.id}>
                  <Table.Cell className="font-medium text-blue-600">#{order.display_id}</Table.Cell>
                  <Table.Cell className="text-ui-fg-muted">
                    {new Date(order.created_at).toLocaleDateString()}
                  </Table.Cell>
                  <Table.Cell>{order.email}</Table.Cell>
                  <Table.Cell>
                    <Badge color={order.payment_status === "captured" ? "green" : "orange"}>
                      {order.payment_status}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell className="text-right font-medium">
                    ${orderVendorTotal.toFixed(2)}
                  </Table.Cell>
                </Table.Row>
              )
            })}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Vendor Dashboard",
  icon: BuildingStorefront,
})

export default VendorDashboard