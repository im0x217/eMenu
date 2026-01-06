require('dotenv').config();
const { IAMClient, ListUserPoliciesCommand, GetUserPolicyCommand, ListAttachedUserPoliciesCommand } = require("@aws-sdk/client-iam");

const iamClient = new IAMClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

(async () => {
  try {
    console.log("Checking IAM policies for user 'Muhanad'...\n");
    
    // List inline policies
    console.log("=== INLINE POLICIES ===");
    const inlineCmd = new ListUserPoliciesCommand({ UserName: "Muhanad" });
    const inlineRes = await iamClient.send(inlineCmd);
    console.log("Inline policies:", inlineRes.PolicyNames || []);
    
    // Get details of each inline policy
    for (const policyName of inlineRes.PolicyNames || []) {
      console.log(`\nPolicy: ${policyName}`);
      const detailCmd = new GetUserPolicyCommand({ UserName: "Muhanad", PolicyName: policyName });
      const detailRes = await iamClient.send(detailCmd);
      console.log("Content:");
      console.log(JSON.stringify(JSON.parse(detailRes.PolicyDocument), null, 2));
    }
    
    // List attached policies
    console.log("\n=== ATTACHED MANAGED POLICIES ===");
    const attachedCmd = new ListAttachedUserPoliciesCommand({ UserName: "Muhanad" });
    const attachedRes = await iamClient.send(attachedCmd);
    if (attachedRes.AttachedPolicies && attachedRes.AttachedPolicies.length > 0) {
      console.log("Attached policies:");
      attachedRes.AttachedPolicies.forEach(policy => {
        console.log(`  - ${policy.PolicyName}`);
      });
    } else {
      console.log("No managed policies attached");
    }
    
  } catch (err) {
    console.error("Error:", err.message);
  }
})();
