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
    
    // Calculate rewards using alternating milestone pattern
    // Pattern: 5th=addon, 10th=drink, 15th=addon, 20th=drink, etc.
    let freeDrinkCount = 0;
    let freeAddonCount = 0;
    
    for (let drinks = 1; drinks <= drinkCount; drinks++) {
        if (drinks % 10 === 0) {  // 10th, 20th, 30th... = free drink
            freeDrinkCount++;
        } else if (drinks % 5 === 0) {  // 5th, 15th, 25th... = free addon
            freeAddonCount++;
        }
    }
    
    // Calculate next milestone
    const getNextMilestone = (currentDrinks) => {
        for (let nextDrinks = currentDrinks + 1; nextDrinks <= currentDrinks + 10; nextDrinks++) {
            if (nextDrinks % 10 === 0) {
                return { drinks: nextDrinks, type: 'free drink' };
            } else if (nextDrinks % 5 === 0) {
                return { drinks: nextDrinks, type: 'free add-on' };
            }
        }
        return null;
    };
    
    const nextMilestone = getNextMilestone(drinkCount);

    // Free drink reward
    rewards.push({
        id: 'free_drink',
        name: 'Free Drink Reward',
        description: freeDrinkCount > 0 ? 
            `You have earned ${freeDrinkCount} free drink${freeDrinkCount > 1 ? 's' : ''}! Apply them when ordering to get drinks free.` : 
            nextMilestone && nextMilestone.type === 'free drink' ? 
                `Complete ${nextMilestone.drinks - drinkCount} more drinks to earn a free drink.` :
                'Earn free drinks at every 10th milestone (10th, 20th, 30th drinks).',
        usage_instructions: freeDrinkCount > 0 ? 
            'Go to the Menu tab and select "Apply Free Drink" when adding items to your cart.' : null,
        drinks_required: 10,
        type: 'free_drink',
        available: freeDrinkCount > 0,
        count: freeDrinkCount
    });
    
    // Free add-on reward
    rewards.push({
        id: 'free_addon',
        name: 'Free Add-on Reward',
        description: freeAddonCount > 0 ? 
            `You have earned ${freeAddonCount} free add-on${freeAddonCount > 1 ? 's' : ''}! Apply them when ordering to get add-ons free.` : 
            nextMilestone && nextMilestone.type === 'free add-on' ? 
                `Complete ${nextMilestone.drinks - drinkCount} more drinks to earn a free add-on.` :
                'Earn free add-ons at every 5th milestone (5th, 15th, 25th drinks).',
        usage_instructions: freeAddonCount > 0 ? 
            'Go to the Menu tab and select "Apply Free Add-on" when adding items with add-ons to your cart. The cheapest add-on will be free.' : null,
        drinks_required: 5,
        type: 'free_addon',
        available: freeAddonCount > 0,
        count: freeAddonCount
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

            const response = await fetch('/api/v1/rewards', { headers });
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

    // Removed reward redemption - rewards are now applied directly in cart

    if (!session?.isAuthenticated) {
        return null; // Will navigate away in useEffect
    }

    return (
        <SystemLayout system={system}>
            <div style={{ padding: '24px 0' }}>
                <header style={{ marginBottom: 24 }}>
                    <h1 style={{ margin: '0 0 8px 0', fontSize: 32 }}>Rewards</h1>
                    <p style={{ margin: 0, color: 'var(--tea-muted)', fontSize: 18 }}>
                        View your available rewards and apply them when ordering.
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
                                        {reward.usage_instructions && (
                                            <div style={{
                                                background: '#f0f9ff',
                                                border: '1px solid #bfdbfe',
                                                borderRadius: 8,
                                                padding: '12px',
                                                margin: '8px 0',
                                                fontSize: 14,
                                                color: '#1e3a8a'
                                            }}>
                                                <strong>How to use:</strong> {reward.usage_instructions}
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                                            <span style={{ 
                                                fontSize: 14, 
                                                fontWeight: 600,
                                                color: reward.available ? '#059669' : '#dc2626'
                                            }}>
                                                Requires {reward.drinks_required} completed drinks
                                            </span>
                                            {reward.available && reward.count > 0 && (
                                                <span style={{ 
                                                    fontSize: 14, 
                                                    fontWeight: 600,
                                                    color: '#059669',
                                                    backgroundColor: '#dcfce7',
                                                    padding: '4px 8px',
                                                    borderRadius: 12,
                                                    border: '1px solid #bbf7d0'
                                                }}>
                                                    {reward.count} available
                                                </span>
                                            )}
                                            <span style={{ 
                                                fontSize: 14, 
                                                fontWeight: 500,
                                                color: reward.available ? '#059669' : '#6b7280'
                                            }}>
                                                {reward.available ? 'Ready to use!' : 'Not yet available'}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ 
                                        padding: '12px 16px',
                                        borderRadius: 12,
                                        backgroundColor: reward.available ? '#dcfce7' : '#f3f4f6',
                                        border: reward.available ? '1px solid #bbf7d0' : '1px solid #d1d5db',
                                        textAlign: 'center',
                                        minWidth: 120
                                    }}>
                                        <div style={{ 
                                            fontSize: 12, 
                                            fontWeight: 500, 
                                            color: reward.available ? '#166534' : '#6b7280',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                        }}>
                                            {reward.available ? 'Apply in Cart' : 'Unavailable'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={cardStyle}>
                        <div style={{ textAlign: 'center' }}>
                            <h3 style={{ margin: '0 0 8px 0' }}>No rewards available yet!</h3>
                            <p style={{ margin: 0, color: 'var(--tea-muted)' }}>
                                Complete more orders to earn rewards. Keep ordering to unlock free drinks and add-ons!
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
                        Earn rewards at milestones: 5th drink = free add-on, 10th drink = free drink, and so on!
                    </p>
                    <div style={{ marginTop: 12, padding: '8px 16px', backgroundColor: '#f0f9ff', borderRadius: 8, border: '1px solid #0ea5e9' }}>
                        <p style={{ margin: 0, fontSize: 14, color: '#0369a1' }}>
                            <strong>Next milestone:</strong> {
                                (() => {
                                    const nextMilestone = generateRewardsFromCount(drinkCount).find(() => true)?.description?.match(/Complete (\d+) more drinks to earn a (.+?)\./);
                                    if (nextMilestone) {
                                        return `${nextMilestone[1]} drinks until ${nextMilestone[2]}`;
                                    }
                                    
                                    // Calculate next milestone manually
                                    for (let nextDrinks = drinkCount + 1; nextDrinks <= drinkCount + 10; nextDrinks++) {
                                        if (nextDrinks % 10 === 0) {
                                            return `${nextDrinks - drinkCount} drinks until free drink`;
                                        } else if (nextDrinks % 5 === 0) {
                                            return `${nextDrinks - drinkCount} drinks until free add-on`;
                                        }
                                    }
                                    return 'Keep ordering to earn more rewards!';
                                })()
                            }
                        </p>
                    </div>
                </div>
            </div>
        </SystemLayout>
    );
}
