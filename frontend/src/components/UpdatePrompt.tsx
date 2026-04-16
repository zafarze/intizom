import { useEffect, useState } from 'react';
import { Download, X, Sparkles } from 'lucide-react';

interface Props {
  onUpdate: () => void;
  onDismiss: () => void;
}

export default function UpdatePrompt({ onUpdate, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 350);
  };

  const handleUpdate = () => {
    setVisible(false);
    setTimeout(onUpdate, 200);
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: visible ? 'translate(-50%, 0)' : 'translate(-50%, 120%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.35s ease',
        zIndex: 99999,
        width: 'min(420px, calc(100vw - 32px))',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e40af 100%)',
          borderRadius: 20,
          padding: '20px 20px 20px 20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Glow blob */}
        <div style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 150,
          height: 150,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.5) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Close button */}
        <button
          onClick={handleDismiss}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: 8,
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.7)',
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
        >
          <X size={14} />
        </button>

        {/* Icon + text */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingRight: 24 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
          }}>
            <Sparkles size={22} color="#fff" />
          </div>
          <div>
            <p style={{
              margin: 0,
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              lineHeight: 1.3,
            }}>
              Доступно обновление
            </p>
            <p style={{
              margin: '3px 0 0',
              color: 'rgba(255,255,255,0.6)',
              fontSize: 13,
              lineHeight: 1.4,
            }}>
              Новая версия Интизом готова к установке
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleUpdate}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: '#fff',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <Download size={15} />
            Обновить сейчас
          </button>
          <button
            onClick={handleDismiss}
            style={{
              padding: '10px 18px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.07)',
              color: 'rgba(255,255,255,0.7)',
              fontWeight: 500,
              fontSize: 14,
              cursor: 'pointer',
              transition: 'background 0.2s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.14)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
          >
            Позже
          </button>
        </div>
      </div>
    </div>
  );
}
