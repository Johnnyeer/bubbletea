import { useState } from 'react';
import { cardStyle, inputStyle, labelStyle, primaryButtonStyle } from './styles.js';

export default function ApplyRewardPanel({ system, session, onRewardApply }) {
    const [rewardCode, setRewardCode] = useState('');
    const [isApplying, setIsApplying] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!rewardCode.trim()) return;

        setIsApplying(true);
        try {
            const headers = { 'Content-Type': 'application/json' };
            if (session?.token) {
                headers.Authorization = `Bearer ${session.token}`;
            }

            const response = await fetch('/api/v1/rewards/code', {
                method: 'POST',
                headers,
                body: JSON.stringify({ code: rewardCode.trim() }),
            });

            const data = await response.json().catch(() => ({}));
            
            if (!response.ok) {
                throw new Error(data.error || 'Invalid reward code');
            }
            
            system?.onStatusMessage?.(`Reward code "${rewardCode}" applied successfully!`);
            setRewardCode('');
            
            // Call the callback if provided
            if (onRewardApply && data.reward) {
                onRewardApply(data.reward.id);
            }
        } catch (err) {
            const message = err.message || 'Unable to apply reward code';
            system?.onStatusMessage?.(message);
        } finally {
            setIsApplying(false);
        }
    };

    return (
        <div style={cardStyle}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 20 }}>Apply Reward Code</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12, alignItems: 'end' }}>
                <label style={{ ...labelStyle, flex: 1, margin: 0 }}>
                    <span style={{ display: 'block', marginBottom: 4 }}>Reward Code</span>
                    <input
                        type="text"
                        value={rewardCode}
                        onChange={(e) => setRewardCode(e.target.value)}
                        placeholder="Enter reward code"
                        style={inputStyle}
                        disabled={isApplying}
                    />
                </label>
                <button
                    type="submit"
                    disabled={!rewardCode.trim() || isApplying}
                    style={{
                        ...primaryButtonStyle,
                        padding: '12px 24px',
                        opacity: (!rewardCode.trim() || isApplying) ? 0.5 : 1,
                        cursor: (!rewardCode.trim() || isApplying) ? 'not-allowed' : 'pointer'
                    }}
                >
                    {isApplying ? 'Applying...' : 'Apply Code'}
                </button>
            </form>
            <p style={{ margin: '12px 0 0 0', fontSize: 14, color: 'var(--tea-muted)' }}>
                Have a reward code? Enter it above to apply it to your account.
            </p>
        </div>
    );
}
