export function Legend() {
  return (
    <section className="panel-section" aria-labelledby="legend-title">
      <div className="section-heading">
        <h3 id="legend-title">Node types</h3>
        <span>Base</span>
      </div>
      <ul className="legend-list">
        <li>
          <span className="legend-symbol legend-normal" aria-hidden="true" />
          <span>
            <strong>Normal</strong>
            <small>Standard control point</small>
          </span>
          <b>+1</b>
        </li>
        <li>
          <span className="legend-symbol legend-hub" aria-hidden="true" />
          <span>
            <strong>Hub</strong>
            <small>Influence counts double</small>
          </span>
          <b>+2</b>
        </li>
        <li>
          <span className="legend-symbol legend-relay" aria-hidden="true" />
          <span>
            <strong>Relay</strong>
            <small>Doubles edge bonus</small>
          </span>
          <b>+1</b>
        </li>
      </ul>
    </section>
  );
}
