import { useEffect, useState } from 'react';
import {
    cardStyle,
    primaryButtonStyle,
    secondaryButtonStyle,
} from './styles.js';
import SystemLayout from './SystemLayout.jsx';

// Generate available rewards based on drink count
const generateRewardsFromCount = (drinkCount) => {
    const rewards = [];
    
    // Free drink reward (requires 10+ drinks)
    rewards.push({
        id: 'free_drink',
        name: 'Free Drink Reward',
        description: drinkCount >= 10 ? 'Redeem a free drink of your choice!' : `Complete ${10 - drinkCount} more drinks to unlock a free drink.`,
        drinks_required: 10,
        type: 'free_drink',
        available: drinkCount >= 10
    });
    
    // Free add-on reward (requires 5+ drinks)
    rewards.push({
        id: 'free_addon',
        name: 'Free Add-on Reward',
        description: drinkCount >= 5 ? 'Get a free add-on with your next drink!' : `Complete ${5 - drinkCount} more drinks to unlock a free add-on.`,
        drinks_required: 5,
        type: 'free_addon',
        available: drinkCount >= 5
    });
    
    return rewards;
};

export default function RewardPage({ system, session, navigate }) {
    const [rewards, setRewards] = useState([]);
    const [drinkCount, setDrinkCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!session?.isAuthenticated) {
            navigate('/order');
            return;
        }
        loadRewards();
    }, [session?.isAuthenticated, navigate]);

    const loadRewards = async () => {
        setIsLoading(true);
        setError('');
        try {
            const headers = { 'Content-Type': 'application/json' };
            if (session?.token) {
                headers.Authorization = `Bearer ${session.token}`;
            }

            const response = await fetch('/api/orders/rewards', { headers });
            const data = await response.json().catch(() => ({}));
            
            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}: Unable to load rewards`);
            }
            
            // Convert drink count to available rewards
            const drinkCount = data.drink_count || 0;
            setDrinkCount(drinkCount);
            const availableRewards = generateRewardsFromCount(drinkCount);
            setRewards(availableRewards);
        } catch (err) {
            const message = err.message || 'Unable to load rewards';
            setError(message);
            system?.onStatusMessage?.(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRewardApply = async (rewardId) => {
        try {
            const headers = { 'Content-Type': 'application/json' };
            if (session?.token) {
                headers.Authorization = `Bearer ${session.token}`;
            }

            // Find the reward being applied
            const reward = rewards.find(r => r.id === rewardId);
            if (!reward) {
                throw new Error('Reward not found');
            }

            const response = await fetch('/api/orders/rewards/redeem', {
                method: 'POST',
                headers,
                body: JSON.stringify({ type: reward.type }),
            });

            const data = await response.json().catch(() => ({}));
            
            if (!response.ok) {
                throw new Error(data.error || 'Unable to redeem reward');
            }
            
            system?.onStatusMessage?.('Reward redeemed successfully!');
            loadRewards(); // Refresh the rewards list
        } catch (err) {
            const message = err.message || 'Unable to redeem reward';
            setError(message);
            system?.onStatusMessage?.(message);
        }
    };

    if (!session?.isAuthenticated) {
        return null; // Will navigate away in useEffect
    }

    return (
        <SystemLayout system={system}>
            <div style={{ padding: '24px 0' }}>
                <header style={{ marginBottom: 24 }}>
                    <h1 style={{ margin: '0 0 8px 0', fontSize: 32 }}>Rewards</h1>
                    <p style={{ margin: 0, color: 'var(--tea-muted)', fontSize: 18 }}>
                        Redeem your points for exclusive discounts and free items.
                    </p>
                </header>

                {error && (
                    <div style={{
                        ...cardStyle,
                        backgroundColor: '#fee2e2',
                        borderColor: '#dc2626',
                        color: '#dc2626',
                        marginBottom: 24
                    }}>
                        <p style={{ margin: 0 }}>{error}</p>
                    </div>
                )}

                {isLoading ? (
                    <div style={cardStyle}>
                        <p style={{ margin: 0, textAlign: 'center' }}>Loading rewards...</p>
                    </div>
                ) : rewards.length > 0 ? (
                    <div style={{ display: 'grid', gap: 16, marginTop: 24 }}>
                        {rewards.map(reward => (
                            <div key={reward.id} style={cardStyle}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 16 }}>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ margin: '0 0 8px 0', fontSize: 20 }}>
                                            {reward.name}
                                        </h3>
                                        <p style={{ margin: '0 0 12px 0', color: 'var(--tea-muted)' }}>
                                            {reward.description}
                                        </p>
                                        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                            <span style={{ 
                                                fontSize: 14, 
                                                fontWeight: 600,
                                                color: reward.available ? '#059669' : '#dc2626'
                                            }}>
                                                Requires {reward.drinks_required} completed drinks
                                            </span>
                                            <span style={{ 
                                                fontSize: 14, 
                                                fontWeight: 500,
                                                color: reward.available ? '#059669' : '#6b7280'
                                            }}>
                                                {reward.available ? 'Available!' : 'Not yet available'}
                                            </span>
                                        </div>
                                    </div>
                                    {reward.available && reward.type !== 'info' && (
                                        <button
                                            onClick={() => handleRewardApply(reward.id)}
                                            style={{
                                                ...primaryButtonStyle,
                                                padding: '8px 16px'
                                            }}
                                        >
                                            Redeem
                                        </button>
                                    )}
                                    {!reward.available && reward.type !== 'info' && (
                                        <button
                                            disabled
                                            style={{
                                                ...secondaryButtonStyle,
                                                padding: '8px 16px',
                                                opacity: 0.5,
                                                cursor: 'not-allowed'
                                            }}
                                        >
                                            Not Available
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={cardStyle}>
                        <div style={{ textAlign: 'center' }}>
                            <h3 style={{ margin: '0 0 8px 0' }}>No rewards available</h3>
                            <p style={{ margin: 0, color: 'var(--tea-muted)' }}>
                                Keep ordering to earn points and unlock exclusive rewards!
                            </p>
                        </div>
                    </div>
                )}

                <div style={{ ...cardStyle, marginTop: 24, textAlign: 'center' }}>
                    <h3 style={{ margin: '0 0 8px 0' }}>Your Loyalty Progress</h3>
                    <p style={{ margin: '0 0 16px 0', fontSize: 24, fontWeight: 600, color: '#059669' }}>
                        {drinkCount} drinks completed
                    </p>
                    <p style={{ margin: 0, color: 'var(--tea-muted)', fontSize: 14 }}>
                        Complete orders to unlock rewards. Get a free drink after every 10 completed orders!
                    </p>
                    <div style={{ marginTop: 12, padding: '8px 16px', backgroundColor: '#f0f9ff', borderRadius: 8, border: '1px solid #0ea5e9' }}>
                        <p style={{ margin: 0, fontSize: 14, color: '#0369a1' }}>
                            <strong>Next milestone:</strong> {
                                drinkCount < 5 ? `${5 - drinkCount} drinks until free add-on` : 
                                drinkCount < 10 ? `${10 - drinkCount} drinks until free drink` : 
                                'All milestone rewards unlocked! Keep ordering to earn more!'
                            }
                        </p>
                    </div>
                </div>
            </div>
        </SystemLayout>
    );
}
