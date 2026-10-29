import React from 'react';

/**
 * TeamChoiceModal
 * Prompts the user to Join or Create a team upon login (without auto-generating a squad).
 */
export function TeamChoiceModal({
  isOpen,
  onClose,
  currentUser,
  onChooseJoin,
  onChooseCreate,
}) {
  if (!isOpen) return null;

  const firstName = currentUser?.name ? currentUser.name.split(' ')[0] : 'there';

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="team-choice-title">
      <div
        className="modal-card team-choice-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header team-choice-header">
          <div className="team-choice-title-group">
            <span className="modal-badge-tag">🏢 GET STARTED</span>
            <h2 id="team-choice-title" className="modal-title">Welcome, {firstName}!</h2>
            <p className="modal-subtitle">
              To see who is coming to the office tomorrow, join your colleagues with a team code or create a new team.
            </p>
          </div>
          <button
            type="button"
            className="btn-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className="team-choice-grid">
          {/* Option 1: Join Team */}
          <div className="team-choice-card join-choice-card">
            <div className="choice-card-icon-wrap join-icon-wrap">
              <span className="choice-emoji">🤝</span>
            </div>
            <div className="choice-card-body">
              <h3 className="choice-title">Join a Team</h3>
              <p className="choice-desc">
                Have a team code from a colleague? Enter the code or pick an active office team to connect with your teammates.
              </p>
            </div>
            <button
              type="button"
              className="btn-choice-action btn-choice-join"
              onClick={() => {
                onClose();
                onChooseJoin();
              }}
            >
              <span>🤝 Join with Code</span>
              <span className="choice-arrow">→</span>
            </button>
          </div>

          {/* Option 2: Create Team */}
          <div className="team-choice-card create-choice-card">
            <div className="choice-card-icon-wrap create-icon-wrap">
              <span className="choice-emoji">➕</span>
            </div>
            <div className="choice-card-body">
              <h3 className="choice-title">Create a Team</h3>
              <p className="choice-desc">
                Start a fresh attendance roster for your department or squad, set your office location, and invite colleagues.
              </p>
            </div>
            <button
              type="button"
              className="btn-choice-action btn-choice-create"
              onClick={() => {
                onClose();
                onChooseCreate();
              }}
            >
              <span>➕ Create a Team</span>
              <span className="choice-arrow">→</span>
            </button>
          </div>
        </div>

        <div className="team-choice-footer-hint">
          <span>💡 You can always create or switch teams anytime from the top menu.</span>
        </div>
      </div>
    </div>
  );
}
