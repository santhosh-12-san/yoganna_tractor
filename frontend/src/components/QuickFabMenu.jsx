import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Tractor, Wrench, PhoneCall, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const QuickFabMenu = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const fabRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (fabRef.current && !fabRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = (path) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <div className="quick-fab-container" ref={fabRef}>
      {/* Sub-action radial buttons */}
      <div className={`fab-actions-menu ${open ? 'expanded' : ''}`}>
        <button
          className="fab-sub-action action-ploughing"
          onClick={() => handleAction('/add-booking?type=Ploughing')}
          title={t('Quick Heavy Ploughing')}
        >
          <Tractor size={18} />
          <span className="fab-tooltip">{t('Heavy Ploughing')}</span>
        </button>

        <button
          className="fab-sub-action action-rotavator"
          onClick={() => handleAction('/add-booking?type=Rotavator')}
          title={t('Rotavator Tillage')}
        >
          <Wrench size={18} />
          <span className="fab-tooltip">{t('Rotavator Service')}</span>
        </button>

        <button
          className="fab-sub-action action-support"
          onClick={() => window.open('tel:+919886776655')}
          title={t('Emergency Call Support')}
        >
          <PhoneCall size={18} />
          <span className="fab-tooltip">{t('24/7 Helpline')}</span>
        </button>
      </div>

      {/* Main Trigger FAB */}
      <button 
        className={`fab-main-btn ${open ? 'active' : ''}`} 
        onClick={() => setOpen(!open)}
        aria-label="Toggle Quick Booking Action Menu"
      >
        {open ? <X size={26} /> : <Plus size={26} />}
      </button>
    </div>
  );
};

export default QuickFabMenu;
