import React from 'react';
import EvidenceUploadCard from '../../components/common/EvidenceUploadCard/EvidenceUploadCard';
import { UXProvider } from '../../components/common/UXProvider';

export default function LabComponent() {
  return (
    <UXProvider>
      <div style={{ padding: '2rem', minHeight: '100vh', background: '#f8fafc' }}>
      <h1 style={{ fontFamily: 'var(--font-primary)', color: 'var(--color-brand-primary)', marginBottom: '1rem' }}>
        <i className="fas fa-flask" style={{ color: 'var(--color-brand-accent)', marginRight: '10px' }}></i>
        Laboratorio de Componentes UI
      </h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
        Lienzo en blanco para aislar, estilizar y probar componentes reutilizables antes de implementarlos en producción.
      </p>
      
      <div style={{ 
        maxWidth: '450px', 
        background: '#ffffff', 
        padding: '1.5rem', 
        borderRadius: '16px', 
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
        border: '1px solid #e2e8f0'
      }}>
        <h3 style={{ 
          marginBottom: '1.5rem', 
          fontSize: '1rem', 
          color: '#334155',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '0.5rem'
        }}>
          Test: <code style={{ color: 'var(--color-brand-primary)', background: '#f8fafc', padding: '2px 6px', borderRadius: '4px' }}>EvidenceUploadCard</code>
        </h3>
        
        <EvidenceUploadCard 
          title="Evidencia (Modo Lab)"
          mockAsyncUpload={true}
          onSubmit={async (formData) => {
            console.log("🛠️ [LabComponent] onSubmit disparado. Datos capturados:");
            for (let pair of formData.entries()) {
              console.log(`- ${pair[0]}:`, pair[1]); 
            }
            // Simulamos un retraso de red
            return new Promise(resolve => setTimeout(resolve, 1500));
          }}
          onSuccess={(data) => console.log("Success callback", data)}
        />
      </div>
    </div>
    </UXProvider>
  );
}
