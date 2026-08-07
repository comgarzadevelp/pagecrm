import React, { useState } from 'react';
import { HUB_NODE, SATELLITE_NODES } from './ecosystemConfig';
import './EcosystemShowcase.css';

export const EcosystemShowcase = () => {
  const [activeNode, setActiveNode] = useState(null);
  const center = 110;

  return (
    <div className="crm-showcase-graphic">
      {/* SVG de Conexiones en segundo plano */}
      <svg className="crm-nodes-svg" viewBox="0 0 220 220" aria-hidden="true">
        {SATELLITE_NODES.map((node) => (
          <g key={`edge-${node.id}`}>
            {/* Línea base estática */}
            <line x1={center} y1={center} x2={node.x} y2={node.y} className="crm-edge" />
            {/* Línea animada de flujo de datos */}
            <line 
              x1={center} 
              y1={center} 
              x2={node.x} 
              y2={node.y} 
              className="crm-edge-flow"
              style={{ animationDelay: node.flowDelay }} 
            />
          </g>
        ))}
      </svg>

      {/* Nodo Central (Hub) */}
      <div 
        className="crm-node crm-node-main"
        onMouseEnter={() => setActiveNode(HUB_NODE)}
        onMouseLeave={() => setActiveNode(null)}
      >
        <i className={HUB_NODE.icon} aria-hidden="true" />
      </div>

      {/* Nodos Satélite dinámicos */}
      {SATELLITE_NODES.map((node, index) => (
        <div 
          key={`node-${node.id}`} 
          className={`crm-node crm-node-${index + 1}`}
          style={{ 
            animationDelay: node.delay,
            top: node.top,
            left: node.left
          }}
          onMouseEnter={() => setActiveNode(node)}
          onMouseLeave={() => setActiveNode(null)}
        >
          <i className={node.icon} aria-hidden="true" />
        </div>
      ))}

      {/* Card Flotante (Tooltip) dinámico al pasar el cursor */}
      {activeNode && (
        <div className="crm-floating-node-card">
          <h4>{activeNode.label}</h4>
          <p>{activeNode.desc}</p>
        </div>
      )}
    </div>
  );
};

export default EcosystemShowcase;
