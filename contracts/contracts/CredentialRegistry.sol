// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract CredentialRegistry {
    struct Credential {
        bytes32 id;
        string studentId;
        address studentWallet;
        string credentialType;
        string title;
        string institution;
        string metadataURI;
        bytes32 metadataHash;
        uint64 issuedAt;
        bool revoked;
        address issuer;
    }

    address public owner;
    mapping(address => bool) public issuers;

    mapping(bytes32 => Credential) private credentials;
    mapping(string => bytes32[]) private studentCredentialIds;
    bytes32[] private allCredentialIds;
    mapping(bytes32 => mapping(address => uint64)) private viewerAccess;

    event IssuerUpdated(address indexed issuer, bool allowed);
    event CredentialIssued(
        bytes32 indexed credentialId,
        string indexed studentId,
        string credentialType,
        address indexed issuer,
        string metadataURI,
        bytes32 metadataHash
    );
    event CredentialRevoked(bytes32 indexed credentialId, address indexed issuer);
    event ViewerAccessGranted(
        bytes32 indexed credentialId,
        address indexed viewer,
        uint64 expiresAt,
        address indexed studentWallet
    );
    event ViewerAccessRevoked(bytes32 indexed credentialId, address indexed viewer, address indexed studentWallet);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyIssuer() {
        require(issuers[msg.sender], "Only issuer");
        _;
    }

    modifier credentialExists(bytes32 credentialId) {
        require(credentials[credentialId].issuedAt != 0, "Credential not found");
        _;
    }

    constructor() {
        owner = msg.sender;
        issuers[msg.sender] = true;
        emit IssuerUpdated(msg.sender, true);
    }

    function setIssuer(address issuer, bool allowed) external onlyOwner {
        require(issuer != address(0), "Invalid issuer");
        issuers[issuer] = allowed;
        emit IssuerUpdated(issuer, allowed);
    }

    function issueCredential(
        string calldata studentId,
        address studentWallet,
        string calldata credentialType,
        string calldata title,
        string calldata institution,
        string calldata metadataURI,
        bytes32 metadataHash
    ) external onlyIssuer returns (bytes32 credentialId) {
        require(bytes(studentId).length > 0, "Student ID required");
        require(studentWallet != address(0), "Student wallet required");
        require(bytes(credentialType).length > 0, "Type required");
        require(bytes(title).length > 0, "Title required");
        require(bytes(institution).length > 0, "Institution required");
        require(bytes(metadataURI).length > 0, "Metadata URI required");
        require(metadataHash != bytes32(0), "Metadata hash required");

        credentialId = keccak256(
            abi.encodePacked(
                studentId,
                studentWallet,
                credentialType,
                metadataHash,
                block.chainid,
                block.timestamp,
                allCredentialIds.length,
                msg.sender
            )
        );

        require(credentials[credentialId].issuedAt == 0, "Credential exists");

        credentials[credentialId] = Credential({
            id: credentialId,
            studentId: studentId,
            studentWallet: studentWallet,
            credentialType: credentialType,
            title: title,
            institution: institution,
            metadataURI: metadataURI,
            metadataHash: metadataHash,
            issuedAt: uint64(block.timestamp),
            revoked: false,
            issuer: msg.sender
        });

        allCredentialIds.push(credentialId);
        studentCredentialIds[studentId].push(credentialId);

        emit CredentialIssued(credentialId, studentId, credentialType, msg.sender, metadataURI, metadataHash);
    }

    function revokeCredential(bytes32 credentialId) external onlyIssuer credentialExists(credentialId) {
        Credential storage credential = credentials[credentialId];
        require(!credential.revoked, "Already revoked");
        credential.revoked = true;
        emit CredentialRevoked(credentialId, msg.sender);
    }

    function grantViewerAccess(
        bytes32 credentialId,
        address viewer,
        uint64 expiresAt
    ) external credentialExists(credentialId) {
        Credential storage credential = credentials[credentialId];
        require(msg.sender == credential.studentWallet, "Only student wallet");
        require(viewer != address(0), "Invalid viewer");
        require(expiresAt > block.timestamp, "Expiration must be in future");

        viewerAccess[credentialId][viewer] = expiresAt;
        emit ViewerAccessGranted(credentialId, viewer, expiresAt, msg.sender);
    }

    function revokeViewerAccess(bytes32 credentialId, address viewer) external credentialExists(credentialId) {
        Credential storage credential = credentials[credentialId];
        require(msg.sender == credential.studentWallet, "Only student wallet");
        delete viewerAccess[credentialId][viewer];
        emit ViewerAccessRevoked(credentialId, viewer, msg.sender);
    }

    function verifyCredential(bytes32 credentialId, bytes32 metadataHash)
        external
        view
        returns (bool exists, bool valid, bool revoked)
    {
        Credential storage credential = credentials[credentialId];
        if (credential.issuedAt == 0) {
            return (false, false, false);
        }
        if (credential.revoked) {
            return (true, false, true);
        }
        return (true, credential.metadataHash == metadataHash, false);
    }

    function canViewerAccess(bytes32 credentialId, address viewer)
        external
        view
        credentialExists(credentialId)
        returns (bool)
    {
        Credential storage credential = credentials[credentialId];

        if (viewer == credential.studentWallet || viewer == credential.issuer) {
            return true;
        }

        return viewerAccess[credentialId][viewer] >= block.timestamp;
    }

    function getCredential(bytes32 credentialId)
        external
        view
        credentialExists(credentialId)
        returns (Credential memory)
    {
        return credentials[credentialId];
    }

    function getAllCredentialIds() external view returns (bytes32[] memory) {
        return allCredentialIds;
    }

    function getStudentCredentialIds(string calldata studentId) external view returns (bytes32[] memory) {
        return studentCredentialIds[studentId];
    }

    function totalCredentials() external view returns (uint256) {
        return allCredentialIds.length;
    }

    function viewerAccessUntil(bytes32 credentialId, address viewer)
        external
        view
        credentialExists(credentialId)
        returns (uint64)
    {
        return viewerAccess[credentialId][viewer];
    }
}
