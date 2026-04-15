function apiBase() {
  return document.getElementById("apiBase").value.replace(/\/$/, "");
}

function show(targetId, data) {
  const el = document.getElementById(targetId);
  el.textContent = typeof data === "string" ? data : JSON.stringify(data, null, 2);
}

async function postJson(path, body) {
  const response = await fetch(`${apiBase()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

function parseOptionalJson(text) {
  if (!text || !text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Details JSON noto'g'ri formatda");
  }
}

document.getElementById("issueForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = new FormData(event.target);

  try {
    const payload = {
      studentId: form.get("studentId"),
      studentWallet: form.get("studentWallet"),
      credentialType: form.get("credentialType"),
      title: form.get("title"),
      institution: form.get("institution"),
      details: parseOptionalJson(form.get("details"))
    };

    const data = await postJson("/credentials/issue", payload);
    show("issueResult", data);
    loadRegistry();
  } catch (error) {
    show("issueResult", { error: error.message });
  }
});

document.getElementById("courseForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = new FormData(event.target);

  try {
    const payload = {
      studentId: form.get("studentId"),
      studentWallet: form.get("studentWallet"),
      courseName: form.get("courseName"),
      platform: form.get("platform"),
      score: form.get("score"),
      grade: form.get("grade")
    };

    const data = await postJson("/courses/result", payload);
    show("courseResult", data);
    loadRegistry();
  } catch (error) {
    show("courseResult", { error: error.message });
  }
});

document.getElementById("verifyForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = new FormData(event.target);

  try {
    const payload = {
      credentialId: form.get("credentialId")
    };

    const metadataHash = form.get("metadataHash");
    if (metadataHash && metadataHash.trim()) {
      payload.metadataHash = metadataHash.trim();
    }

    const data = await postJson("/credentials/verify", payload);
    show("verifyResult", data);
  } catch (error) {
    show("verifyResult", { error: error.message });
  }
});

document.getElementById("grantForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = new FormData(event.target);

  try {
    const payload = {
      credentialId: form.get("credentialId"),
      viewerAddress: form.get("viewerAddress"),
      studentPrivateKey: form.get("studentPrivateKey")
    };

    const expiresAt = form.get("expiresAt");
    if (expiresAt && expiresAt.trim()) {
      payload.expiresAt = Number(expiresAt.trim());
    }

    const data = await postJson("/access/grant", payload);
    show("grantResult", data);
  } catch (error) {
    show("grantResult", { error: error.message });
  }
});

async function loadRegistry() {
  const tbody = document.getElementById("registryBody");
  tbody.innerHTML = "<tr><td colspan='6'>Yuklanmoqda...</td></tr>";

  try {
    const response = await fetch(`${apiBase()}/credentials`);
    const rows = await response.json();

    if (!response.ok) {
      throw new Error(rows.error || "Registry request failed");
    }

    if (!rows.length) {
      tbody.innerHTML = "<tr><td colspan='6'>Hali credential yo'q</td></tr>";
      return;
    }

    tbody.innerHTML = rows
      .map(
        (item) => `
          <tr>
            <td class="code">${item.id.slice(0, 10)}...</td>
            <td>${item.studentId}</td>
            <td>${item.credentialType}</td>
            <td>${item.title}</td>
            <td>${item.institution}</td>
            <td class="${item.revoked ? "bad" : "ok"}">${item.revoked ? "Yes" : "No"}</td>
          </tr>
        `
      )
      .join("");
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan='6'>Xato: ${error.message}</td></tr>`;
  }
}

document.getElementById("refreshRegistry").addEventListener("click", loadRegistry);

loadRegistry();
