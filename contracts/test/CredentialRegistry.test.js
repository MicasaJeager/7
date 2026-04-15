const { expect } = require("chai");

describe("CredentialRegistry", function () {
  async function deployFixture() {
    const [owner, student, viewer] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("CredentialRegistry");
    const registry = await Registry.deploy();
    await registry.waitForDeployment();
    return { registry, owner, student, viewer };
  }

  it("issues and verifies credential", async function () {
    const { registry, student } = await deployFixture();

    const studentId = "STD-1001";
    const credentialType = "diploma";
    const title = "BSc Computer Science";
    const institution = "Demo University";
    const metadataURI = "ipfs://bafy-demo";
    const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("demo-metadata"));

    const tx = await registry.issueCredential(
      studentId,
      student.address,
      credentialType,
      title,
      institution,
      metadataURI,
      metadataHash
    );

    const receipt = await tx.wait();
    const issuedEvent = receipt.logs
      .map((l) => {
        try {
          return registry.interface.parseLog(l);
        } catch {
          return null;
        }
      })
      .find((e) => e && e.name === "CredentialIssued");

    const credentialId = issuedEvent.args.credentialId;

    const result = await registry.verifyCredential(credentialId, metadataHash);
    expect(result.exists).to.equal(true);
    expect(result.valid).to.equal(true);
    expect(result.revoked).to.equal(false);
  });

  it("allows student to share access", async function () {
    const { registry, student, viewer } = await deployFixture();

    const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("share-test"));
    const tx = await registry.issueCredential(
      "STD-2002",
      student.address,
      "certificate",
      "Blockchain Basics",
      "Demo University",
      "ipfs://bafy-share",
      metadataHash
    );

    const receipt = await tx.wait();
    const issuedEvent = receipt.logs
      .map((l) => {
        try {
          return registry.interface.parseLog(l);
        } catch {
          return null;
        }
      })
      .find((e) => e && e.name === "CredentialIssued");

    const credentialId = issuedEvent.args.credentialId;
    const expiry = BigInt(Math.floor(Date.now() / 1000) + 3600);

    await registry.connect(student).grantViewerAccess(credentialId, viewer.address, expiry);
    expect(await registry.canViewerAccess(credentialId, viewer.address)).to.equal(true);
  });
});
