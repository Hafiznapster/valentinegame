import React, { useState, useEffect, useRef } from 'react';

// New Asset Paths
const SPRITES = {
    hafi: [
        '/assets/hafi/1.png',
        '/assets/hafi/2.png',
        '/assets/hafi/3.png',
        '/assets/hafi/4.png',
    ],
    sonu: [
        '/assets/sonu/1.png',
        '/assets/sonu/2.png',
        '/assets/sonu/3.png',
        '/assets/sonu/4.png',
        '/assets/sonu/5.png',
        '/assets/sonu/6.png',
        '/assets/sonu/7.png',
    ],
    tulip: '/assets/tulip.png',
};

const ValentineGame = () => {
    const canvasRef = useRef(null);

    // Game State Refs (mutable state for game loop)
    const gameRef = useRef({
        hafiX: 50,
        hasFlowers: false,
        flowersOnGround: true,
        sonuState: 'idle', // 'idle', 'jumping'
        reachedSonu: false,
        particles: [], // For heart effects
        startTime: Date.now(),
    });

    // Assets Ref (to share images between effects)
    const assetsRef = useRef({
        hafi: [],
        sonu: [],
        tulip: null
    });

    // UI State
    const [uiState, setUiState] = useState({
        showPopup: false,
        isMobileLandscape: true,
        loaded: false,
        error: null
    });

    // Constants
    const GROUND_Y = 300;
    const SONU_X = 600;
    const FLOWER_X = 300;

    // Mobile Orientation Check
    useEffect(() => {
        const checkOrientation = () => {
            const isLandscape = window.innerWidth > window.innerHeight;
            setUiState(prev => ({ ...prev, isMobileLandscape: isLandscape }));
        };

        window.addEventListener('resize', checkOrientation);
        checkOrientation();
        return () => window.removeEventListener('resize', checkOrientation);
    }, []);

    // 1. Image Preloading Effect
    useEffect(() => {
        let loadedCount = 0;
        const totalImages = SPRITES.hafi.length + SPRITES.sonu.length + 1;
        let isMounted = true;

        const checkLoaded = () => {
            if (!isMounted) return;
            loadedCount++;
            if (loadedCount >= totalImages) {
                setUiState(prev => ({ ...prev, loaded: true }));
            }
        };

        const handleLoadError = (src) => {
            console.error(`Failed to load image: ${src}`);
            checkLoaded();
        };

        // Load Hafi Frames
        assetsRef.current.hafi = SPRITES.hafi.map(src => {
            const img = new Image();
            img.onload = checkLoaded;
            img.onerror = () => handleLoadError(src);
            img.src = src;
            return img;
        });

        // Load Sonu Frames
        assetsRef.current.sonu = SPRITES.sonu.map(src => {
            const img = new Image();
            img.onload = checkLoaded;
            img.onerror = () => handleLoadError(src);
            img.src = src;
            return img;
        });

        // Load Tulip
        const tulipImg = new Image();
        tulipImg.onload = checkLoaded;
        tulipImg.onerror = () => handleLoadError(SPRITES.tulip);
        tulipImg.src = SPRITES.tulip;
        assetsRef.current.tulip = tulipImg;

        // Timeout Fallback
        const timeoutId = setTimeout(() => {
            if (isMounted && loadedCount < totalImages) {
                console.warn("Loading timed out, starting game anyway.");
                setUiState(prev => ({ ...prev, loaded: true }));
            }
        }, 2000);

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
    }, []); // Run once on mount

    // 2. Game Loop Effect
    useEffect(() => {
        if (!uiState.loaded) return;

        const canvas = canvasRef.current;
        // With conditional rendering, canvas should be available now
        if (!canvas) {
            console.error("Canvas ref is null despite loaded state");
            return;
        }

        const ctx = canvas.getContext('2d');
        let animationFrameId;
        const images = assetsRef.current;

        const render = () => {
            const now = Date.now();
            const state = gameRef.current;

            // Clear Screen with Gradient Sky
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, '#87CEEB'); // Sky Blue
            gradient.addColorStop(1, '#E0F7FA'); // Light Cyan
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw Clouds (Simple shapes)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(100, 80, 30, 0, Math.PI * 2);
            ctx.arc(140, 80, 40, 0, Math.PI * 2);
            ctx.arc(180, 80, 30, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.arc(600, 120, 25, 0, Math.PI * 2);
            ctx.arc(640, 120, 35, 0, Math.PI * 2);
            ctx.arc(680, 120, 25, 0, Math.PI * 2);
            ctx.fill();

            // Draw Ground with Gradient
            const groundGradient = ctx.createLinearGradient(0, GROUND_Y + 40, 0, canvas.height);
            groundGradient.addColorStop(0, '#4CAF50'); // Green
            groundGradient.addColorStop(1, '#2E7D32'); // Darker Green
            ctx.fillStyle = groundGradient;
            ctx.fillRect(0, GROUND_Y + 40, canvas.width, canvas.height - (GROUND_Y + 40));

            // Draw Grass accents
            ctx.strokeStyle = '#388E3C';
            ctx.lineWidth = 2;
            for (let i = 0; i < canvas.width; i += 20) {
                ctx.beginPath();
                ctx.moveTo(i, GROUND_Y + 40);
                ctx.lineTo(i + 5, GROUND_Y + 30);
                ctx.stroke();
            }

            // --- Game Logic ---

            // 1. Move Hafi
            if (state.hafiX < SONU_X - 60) {
                state.hafiX += 2.5; // Walking speed

                // Pickup Flowers Logic
                if (!state.hasFlowers && Math.abs(state.hafiX - FLOWER_X) < 30) {
                    state.hasFlowers = true;
                    state.flowersOnGround = false;
                }
            } else {
                // Hafi reached Sonu
                if (state.sonuState === 'idle') {
                    state.sonuState = 'jumping';
                    state.reachedSonu = true;
                    if (!state.popupTriggered) {
                        state.popupTriggered = true;
                        setTimeout(() => {
                            setUiState(prev => ({ ...prev, showPopup: true }));
                        }, 500);
                    }
                }
            }

            // --- Draw Sprites ---

            // Draw Flowers (On ground)
            if (state.flowersOnGround && images.tulip) {
                ctx.drawImage(images.tulip, FLOWER_X, GROUND_Y + 10, 40, 40);
            }

            // Draw Hafi (Walking Animation)
            let hafiFrameIndex = 0;
            if (state.hafiX < SONU_X - 60) {
                hafiFrameIndex = Math.floor(now / 150) % images.hafi.length;
            } else {
                hafiFrameIndex = 0;
            }

            const hafiY = GROUND_Y - 10;
            const hafiImg = images.hafi[hafiFrameIndex];
            if (hafiImg && hafiImg.complete) {
                ctx.drawImage(hafiImg, state.hafiX, hafiY, 80, 80);
            }

            if (state.hasFlowers && images.tulip) {
                // Draw flowers in hand
                const handX = state.hafiX + 45;
                const handY = hafiY + 35;
                ctx.drawImage(images.tulip, handX, handY, 25, 25);
            }

            // Draw Sonu (Idle/Jump Animation)
            const sonuFrameIndex = Math.floor(now / 200) % images.sonu.length;
            let sonuY = GROUND_Y - 10;

            if (state.sonuState === 'jumping') {
                sonuY = (GROUND_Y - 10) - Math.abs(Math.sin(now / 150) * 30);

                // Spawn Hearts
                if (Math.random() < 0.05) {
                    state.particles.push({
                        x: SONU_X + 40 + (Math.random() * 40 - 20),
                        y: sonuY,
                        vy: -1 - Math.random(),
                        life: 1.0,
                        msg: "❤️"
                    });
                }
            }

            const sonuImg = images.sonu[sonuFrameIndex];
            // Check if image exists before drawing to prevent crashes
            if (sonuImg && sonuImg.complete) {
                ctx.drawImage(sonuImg, SONU_X, sonuY, 80, 80);
            }

            // --- Particles (Hearts) ---
            for (let i = state.particles.length - 1; i >= 0; i--) {
                const p = state.particles[i];
                p.y += p.vy;
                p.life -= 0.01;

                ctx.fillStyle = `rgba(233, 30, 99, ${p.life})`;
                ctx.font = "24px Arial";
                ctx.fillText(p.msg, p.x, p.y);

                if (p.life <= 0) {
                    state.particles.splice(i, 1);
                }
            }

            animationFrameId = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animationFrameId);
    }, [uiState.loaded]); // Empty dependency logic handled by conditional hook execution? No.
    // When uiState.loaded changes to true, this effect runs.

    // Render HTML
    if (!uiState.isMobileLandscape) {
        return (
            <div style={styles.rotateMessage}>
                <div style={styles.rotateContent}>
                    <span style={{ fontSize: '48px', display: 'block', marginBottom: '20px' }}>📱➡️</span>
                    <p style={{ fontSize: '24px', margin: 0 }}>Please rotate your device to Landscape mode!</p>
                </div>
            </div>
        );
    }

    if (!uiState.loaded) {
        return (
            <div style={{ ...styles.loading, flexDirection: 'column' }}>
                <div style={{ fontSize: '40px', marginBottom: '20px' }}>❤️</div>
                Loading Love...
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.gameWrapper}>
                <canvas ref={canvasRef} width={800} height={450} style={styles.canvas} />

                {uiState.showPopup && (
                    <div className="popup-overlay" style={styles.popup}>
                        <h1 style={styles.popupTitle}>❤️ Happy Valentine's Day! ❤️</h1>
                        <p style={styles.popupText}>You are my favorite adventure!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Styles
const styles = {
    container: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        width: '100vw',
        backgroundColor: '#1a1a1a',
        overflow: 'hidden',
    },
    gameWrapper: {
        position: 'relative',
        boxShadow: '0 0 50px rgba(0,0,0,0.5)',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '8px solid #333',
        maxWidth: '100%',
        maxHeight: '100%',
    },
    canvas: {
        display: 'block',
        backgroundColor: '#87CEEB',
        maxWidth: '100%',
        maxHeight: '100vh',
        width: '100%', // Responsive
        height: 'auto', // Aspect ratio
    },
    rotateMessage: {
        display: 'flex',
        height: '100vh',
        width: '100vw',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffb7b2',
        color: '#fff',
        fontFamily: '"Comic Sans MS", cursive, sans-serif',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 100,
    },
    rotateContent: {
        textAlign: 'center',
    },
    loading: {
        height: '100vh',
        width: '100vw',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: '24px',
        color: '#E91E63',
        backgroundColor: '#fff',
        fontFamily: 'sans-serif',
    },
    popup: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '40px',
        borderRadius: '20px',
        textAlign: 'center',
        color: '#E91E63',
        boxShadow: '0 10px 30px rgba(233, 30, 99, 0.3)',
        border: '4px solid #E91E63',
        minWidth: '300px',
        zIndex: 20
    },
    popupTitle: {
        margin: '0 0 10px 0',
        fontSize: '32px',
        textShadow: '2px 2px 0px rgba(0,0,0,0.1)',
    },
    popupText: {
        margin: 0,
        fontSize: '18px',
        color: '#555',
    }
};

export default ValentineGame;
