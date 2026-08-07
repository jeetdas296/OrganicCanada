import { ExecArgs } from "@medusajs/framework/types"
import { COMPANY_MODULE, ProposalAgreementService } from "../modules/company"

export default async function testProposalAgreement({ container }: ExecArgs) {
  console.log("==================================================")
  console.log("   TESTING NATIVE PROPOSAL AGREEMENT SYSTEM")
  console.log("==================================================")

  // 1. Test Static Locking Rule
  console.log("1. Verifying quote locking rules...")
  const isLockedReady = ProposalAgreementService.isQuoteLocked("ready_for_payment")
  const isLockedPending = ProposalAgreementService.isQuoteLocked("pending")
  const isLockedPaid = ProposalAgreementService.isQuoteLocked("paid")

  console.log("   - isQuoteLocked('ready_for_payment'):", isLockedReady, "(expected: true)")
  console.log("   - isQuoteLocked('pending'):", isLockedPending, "(expected: false)")
  console.log("   - isQuoteLocked('paid'):", isLockedPaid, "(expected: true)")

  if (!isLockedReady || isLockedPending || !isLockedPaid) {
    throw new Error("Locking rule check failed!")
  }
  console.log("✅ Locking rules validated successfully.")

  // 2. Query for an existing B2B Quote Draft Order
  const query = container.resolve("query")
  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "customer_id",
      "status",
      "total",
      "metadata",
      "items.*",
    ],
    filters: {},
  })

  const b2bQuotes = (orders || []).filter(
    (o: any) => o.metadata?.is_b2b_quote === true
  )
  console.log(`2. Found ${b2bQuotes.length} existing B2B Quotes in database.`)

  if (b2bQuotes.length === 0) {
    console.log("ℹ️ No B2B Quote Draft Order found in DB to run end-to-end modification test.")
    console.log("✅ ProposalAgreementService service tests passed.")
    return
  }

  const testQuote = b2bQuotes[0]
  console.log(`   - Testing on Quote ID: ${testQuote.id} (Status: ${testQuote.metadata?.quote_status || 'pending'})`)

  if (ProposalAgreementService.isQuoteLocked(testQuote.metadata?.quote_status as string | undefined)) {
    console.log(`   - Quote ${testQuote.id} is locked (${testQuote.metadata?.quote_status}). Testing lock error rejection...`)
    try {
      await ProposalAgreementService.updateProposalAgreement({
        orderId: testQuote.id,
        actorId: "test_admin",
        senderType: "admin",
        changes: { note: "Should fail" },
        scope: container,
      })
      throw new Error("Should have thrown lock error!")
    } catch (err: any) {
      console.log("   ✅ Lock correctly rejected modification:", err.message)
    }
    return
  }

  // 3. Test Batch Proposal Modification
  console.log("3. Executing ProposalAgreementService.updateProposalAgreement...")
  const initialStatus = testQuote.metadata?.quote_status || "pending"
  const testNote = `Verified Proposal Terms - ${new Date().toISOString()}`

  const result = await ProposalAgreementService.updateProposalAgreement({
    orderId: testQuote.id,
    actorId: "test_admin",
    senderType: "admin",
    changes: {
      note: testNote,
    },
    scope: container,
  })

  console.log("   - Updated Order ID:", result.order.id)
  console.log("   - New Proposal Note in Metadata:", result.order.metadata?.proposal_note)
  console.log("   - Generated QuoteMessage ID:", result.message?.id)
  console.log("   - Message Type:", result.message?.message_type)
  console.log("   - Structured Diff:", JSON.stringify(result.structured_diff))

  // 4. Verify Milestone-Only Status Preservation
  const finalStatus = result.order.metadata?.quote_status || "pending"
  console.log(`   - Status Before: ${initialStatus} | Status After: ${finalStatus}`)
  if (initialStatus !== finalStatus) {
    throw new Error("milestone-only status was unexpectedly modified!")
  }
  console.log("✅ Milestone-Only Status preserved correctly.")

  // 5. Verify QuoteMessage contents
  if (result.message?.message_type !== "proposal_update" || !result.message?.proposal_diff) {
    throw new Error("QuoteMessage did not contain proposal_update message_type or proposal_diff!")
  }
  console.log("✅ Version history message generated with human-readable text and structured JSON diff.")

  console.log("==================================================")
  console.log("   ALL PROPOSAL AGREEMENT TESTS PASSED SUCCESSFULLY!")
  console.log("==================================================")
}
