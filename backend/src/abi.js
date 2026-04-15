module.exports = [
  "function issueCredential(string studentId,address studentWallet,string credentialType,string title,string institution,string metadataURI,bytes32 metadataHash) returns (bytes32)",
  "function verifyCredential(bytes32 credentialId,bytes32 metadataHash) view returns (bool exists,bool valid,bool revoked)",
  "function getCredential(bytes32 credentialId) view returns ((bytes32 id,string studentId,address studentWallet,string credentialType,string title,string institution,string metadataURI,bytes32 metadataHash,uint64 issuedAt,bool revoked,address issuer))",
  "function getAllCredentialIds() view returns (bytes32[])",
  "function getStudentCredentialIds(string studentId) view returns (bytes32[])",
  "function canViewerAccess(bytes32 credentialId,address viewer) view returns (bool)",
  "function viewerAccessUntil(bytes32 credentialId,address viewer) view returns (uint64)",
  "function grantViewerAccess(bytes32 credentialId,address viewer,uint64 expiresAt)",
  "function totalCredentials() view returns (uint256)"
];
