'use strict';

const functions = require('@google-cloud/functions-framework');
const {CloudBillingClient} = require('@google-cloud/billing');

const billing = new CloudBillingClient();

function readBudgetPayload(cloudEvent) {
  const data = cloudEvent?.data?.message?.data;
  if (!data) {
    throw new Error('Pub/Sub message data is missing');
  }

  return JSON.parse(Buffer.from(data, 'base64').toString('utf8'));
}

async function isBillingEnabled(projectName) {
  const [billingInfo] = await billing.getProjectBillingInfo({name: projectName});
  return Boolean(billingInfo.billingEnabled);
}

async function disableBilling(projectName) {
  const [billingInfo] = await billing.updateProjectBillingInfo({
    name: projectName,
    resource: {
      billingAccountName: '',
    },
  });

  return billingInfo;
}

functions.cloudEvent('stopBillingOnBudget', async (cloudEvent) => {
  const payload = readBudgetPayload(cloudEvent);
  const targetProjectId = process.env.TARGET_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  const disableBillingEnabled = process.env.DISABLE_BILLING === 'true';

  if (!targetProjectId) {
    throw new Error('TARGET_PROJECT_ID or GOOGLE_CLOUD_PROJECT must be set');
  }

  const projectName = `projects/${targetProjectId}`;
  const costAmount = Number(payload.costAmount);
  const budgetAmount = Number(payload.budgetAmount);

  console.log(
    JSON.stringify({
      message: 'Budget notification received',
      targetProjectId,
      costAmount,
      budgetAmount,
      disableBillingEnabled,
    })
  );

  if (!Number.isFinite(costAmount) || !Number.isFinite(budgetAmount)) {
    throw new Error('Budget notification does not include numeric costAmount and budgetAmount');
  }

  if (costAmount <= budgetAmount) {
    console.log('Cost is within budget. No action taken.');
    return;
  }

  if (!disableBillingEnabled) {
    console.log('Billing disable is in simulation mode. Set DISABLE_BILLING=true to disable billing.');
    return;
  }

  if (!(await isBillingEnabled(projectName))) {
    console.log('Billing is already disabled.');
    return;
  }

  const result = await disableBilling(projectName);
  console.log(`Billing disabled for ${projectName}: ${JSON.stringify(result)}`);
});
