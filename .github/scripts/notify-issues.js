const process = require("process");
const cp = require("child_process");

const Labels = {
  needsAttention: "needs attention",
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const workflowMaintainer = process.env.WORKFLOW_MAINTAINER_EMAIL;
const repoMaintainers = JSON.parse(process.env.REPO_MAINTAINERS);
const repoMaintainersMap = new Map(
  repoMaintainers.maintainers.map((m) => [m.github, m.alias])
);

async function sendEmail(to, subject, body) {
  return cp.execSync(".github/scripts/send-email.sh", {
    env: {
      ...process.env,
      SUBJECT: subject,
      TO: to,
      BODY: JSON.stringify(body),
    },
  });
}

async function main() {
  const repo = "microsoft/vscode-ai-toolkit";
  const output = cp.execSync(
    `gh issue list --repo ${repo} --state open --json number,title,assignees,labels,url`,
    { encoding: "utf-8" }
  );
  const issues = JSON.parse(output);

  let unknownAssignees = new Set();
  // alias => issue[]
  const userMapping = new Map();
  for (const issue of issues) {
    const needsAttention = !!issue?.labels?.find((label) => label?.name === Labels.needsAttention);
    if (needsAttention && issue?.assignees?.length && issue.assignees.length > 0) {
      const emails = issue.assignees.map((assignee) => {
        const alias = repoMaintainersMap.get(assignee.login);
        if (!alias) {
          unknownAssignees.add(assignee.login);
          return undefined;
        } else {
          return `${alias}@microsoft.com`;
        }
      }).filter((email) => !!email);
      
      for (const email of emails) {
        if (!userMapping.has(email)) {
          userMapping.set(email, []);
        }
        userMapping.set(email, [...userMapping.get(email), issue]);
      }
    }
  }

  // Send email once for each assigned user
  for (const [email, issues] of userMapping.entries()) {
    console.log(`Sending email to ${email} for issue ${JSON.stringify(issues)}`);
    const body = `
<p>Hi, here are GitHub issues that needs your attention:</p>
${issues.map((issue) =>`<p><a href="${escapeHtml(issue.url)}">#${escapeHtml(issue.number)}</a>: ${escapeHtml(issue.title)} (${escapeHtml(issue.url)})</p>
<hr />
<p>* Remove the "needs attention" label or close the issue in order not to receive this notification.</p>`)}
`;
    await sendEmail(
      email,
      `[Needs attention] AI Toolkit GitHub issue report`,
      body,
    );
  }

  if (unknownAssignees.size > 0) {
    await sendEmail(
      workflowMaintainer,
      `There are unknown assignees in ${repo}`,
      `There are unknown assignees in the issues: ${Array.from(
        unknownAssignees
      ).join(
        ", "
      )}, please update <a href="https://github.com/microsoft/vscode-ai-toolkit/blob/main/.github/data/maintainers.json">maintainers.json</a>. `
    );
  }
}


main()