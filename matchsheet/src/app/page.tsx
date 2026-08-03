export default function HomePage() {
  return (
    <div className="matchsheet-empty">
      <div>
        <i className="bx bx-football text-muted mb-3 d-block" style={{ fontSize: "3rem" }} aria-hidden="true" />
        <h4 className="text-muted">Sélectionnez un match</h4>
        <p className="text-muted mb-0">Choisissez un match dans la barre du bas pour ouvrir sa feuille.</p>
      </div>
    </div>
  );
}
