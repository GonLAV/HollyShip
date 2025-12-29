export default function ReturnVaultStarter() {
  return (
    <div>
      <h1>Starter: Return Label Vault</h1>
      <p>Goal: Securely store, search, and retrieve return labels with expiry and one-time access links.</p>
      <h3>Acceptance Criteria</h3>
      <ul>
        <li>Upload and list return labels with metadata.</li>
        <li>Generate expiring share links; revoke access.</li>
        <li>Audit entries for access history.</li>
      </ul>
      <h3>APIs & Data</h3>
      <ul>
        <li>POST/GET return labels (new endpoints required).</li>
        <li>Signed URL generation for private assets.</li>
      </ul>
      <h3>Next Steps</h3>
      <ol>
        <li>Create label upload form and table view.</li>
        <li>Design share-link model and server routes.</li>
        <li>Add audit trail UI.</li>
      </ol>
    </div>
  )
}
