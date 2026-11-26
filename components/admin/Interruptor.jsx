"use client";

export default function Interruptor({ ligado, aoMudar, rotulo, texto }) {
  return (
    <label className="interruptor">
      <span>
        <strong>{rotulo}</strong>
        {texto && <small>{texto}</small>}
      </span>
      <input type="checkbox" role="switch" checked={ligado} onChange={(e) => aoMudar(e.target.checked)} />
      <i aria-hidden="true" />
    </label>
  );
}
