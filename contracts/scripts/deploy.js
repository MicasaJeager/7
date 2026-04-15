async function main() {
  const Registry = await ethers.getContractFactory("CredentialRegistry");
  const registry = await Registry.deploy();

  await registry.waitForDeployment();

  console.log("CredentialRegistry deployed:", await registry.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
