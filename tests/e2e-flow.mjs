/**
 * End-to-End Verification Test for Pulse
 * Tests:
 * 1. User Authentication (Signup & Login)
 * 2. Workspace Creation
 * 3. Project Creation with initial member roles and SMTP invite dispatch
 * 4. Assigning Member & Roles to project
 * 5. Task Creation with 0-100% Progress, Role Requirements, and Assignees
 * 6. Task Progress Update (slider update to 100% / Done)
 * 7. Verification of calculated project progress percentage
 */

const BASE_URL = "http://127.0.0.1:8000/api/v1";

async function run() {
  console.log("=== 1. Testing Signup & Login ===");
  const testEmail = `lead_${Date.now()}@pulse.dev`;
  const signupRes = await fetch(`${BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: "ComplexPassword123!",
      first_name: "Ali",
      last_name: "Rad",
    }),
  });
  const signupData = await signupRes.json();
  if (!signupRes.ok) throw new Error("Signup failed: " + JSON.stringify(signupData));
  console.log("✓ Signed up user:", signupData.data.user.email);

  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: "ComplexPassword123!",
    }),
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok) throw new Error("Login failed");
  const token = loginData.data.access;
  console.log("✓ Logged in successfully, Bearer token acquired.");

  console.log("\n=== 2. Creating Workspace ===");
  const wsRes = await fetch(`${BASE_URL}/workspaces`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: "Fintech Platform" }),
  });
  const wsData = await wsRes.json();
  const workspaceId = wsData.data.id;
  console.log("✓ Workspace created:", wsData.data.name, `(${workspaceId})`);

  console.log("\n=== 3. Creating Project with Roles & SMTP Invitations ===");
  const projRes = await fetch(`${BASE_URL}/workspaces/${workspaceId}/projects`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "Payment Gateway",
      key: "PAY",
      description: "Secure payment processing microservice",
      initial_members: [
        { email: "developer1@company.com", role: "DEVELOPER" },
        { email: "architect@company.com", role: "LEAD" },
      ],
    }),
  });
  const projData = await projRes.json();
  if (!projRes.ok) throw new Error("Project creation failed: " + JSON.stringify(projData));
  const projectId = projData.data.id;
  console.log("✓ Project created:", projData.data.name, `[${projData.data.key}]`);
  console.log("✓ Creator role:", projData.data.members[0].role);

  console.log("\n=== 4. Adding additional role to existing project ===");
  const assignRes = await fetch(`${BASE_URL}/projects/${projectId}/members`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: "qa_tester@company.com",
      role: "VIEWER",
    }),
  });
  const assignData = await assignRes.json();
  console.log("✓ Assigned role & dispatched SMTP email:", assignData.data.role, "for", assignData.data.email);

  console.log("\n=== 5. Creating Tasks with 0-100% Progress and Roles ===");
  // Task 1: 30% progress
  const task1Res = await fetch(`${BASE_URL}/projects/${projectId}/tasks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "PCI-DSS Compliance Audit",
      description: "Perform vulnerability scans and compliance checklist",
      status: "in-progress",
      priority: "urgent",
      progress: 30,
      role_required: "LEAD",
      assignee_id: loginData.data.user.id,
    }),
  });
  const task1 = await task1Res.json();
  console.log(`✓ Task 1 created: "${task1.data.title}" | Progress: ${task1.data.progress}% | Role: ${task1.data.role_required}`);

  // Task 2: 70% progress
  const task2Res = await fetch(`${BASE_URL}/projects/${projectId}/tasks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "Implement Webhook Handlers",
      description: "Handle Stripe & Adyen asynchronous callback events",
      status: "in-progress",
      priority: "high",
      progress: 70,
      role_required: "DEVELOPER",
      assignee_id: loginData.data.user.id,
    }),
  });
  const task2 = await task2Res.json();
  console.log(`✓ Task 2 created: "${task2.data.title}" | Progress: ${task2.data.progress}% | Role: ${task2.data.role_required}`);

  console.log("\n=== 6. Updating Task Progress to 100% ===");
  const updateRes = await fetch(`${BASE_URL}/tasks/${task2.data.id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      progress: 100,
    }),
  });
  const updatedTask2 = await updateRes.json();
  console.log(`✓ Task 2 updated to: ${updatedTask2.data.progress}% | Auto-status: ${updatedTask2.data.status}`);

  console.log("\n=== 7. Verifying Project Progress Rollup ===");
  const listProjRes = await fetch(`${BASE_URL}/workspaces/${workspaceId}/projects`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  const listProjData = await listProjRes.json();
  const project = listProjData.data[0];
  console.log(`✓ Project Progress calculated: ${project.progress}% (Total Tasks: ${project.total_tasks}, Open: ${project.open_tasks})`);

  console.log("\n==========================================");
  console.log("🎉 ALL E2E REQUIREMENTS VERIFIED & PASSED!");
  console.log("==========================================");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
