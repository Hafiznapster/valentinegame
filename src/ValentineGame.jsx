import React, { useState, useEffect, useRef } from 'react';
import backgroundImage from './assets/background.png';

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
    background: backgroundImage,
};

const ValentineGame = () => {
    const canvasRef = useRef(null);

    // Game State Refs
    const gameRef = useRef({
        hafiX: 50,
        hasFlowers: false,
        flowersOnGround: true,
        sonuState: 'idle', // 'idle', 'jumping'
        reachedSonu: false,
        particles: [], // For heart effects
        startTime: Date.now(),
        popupTriggered: false
    });

    // Assets Ref
    const assetsRef = useRef({
        hafi: [],
        sonu: [],
        tulip: null,
        background: null
    });

    // UI State
    const [uiState, setUiState] = useState({
        showPopup: false,
        isMobileLandscape: true,
        loaded: false,
        error: null,
        letterOpen: false
    });

    const [dimensions, setDimensions] = useState({
        width: window.innerWidth,
        height: window.innerHeight
    });

    // Handle Resize
    useEffect(() => {
        const handleResize = () => {
            setDimensions({ width: window.innerWidth, height: window.innerHeight });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Constants (Dynamic now)
    // const GROUND_Y = 365;  <- Moved to render loop
    // const SONU_X = 600;    <- Moved to render loop
    // const FLOWER_X = 300;  <- Moved to render loop

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
        const totalImages = SPRITES.hafi.length + SPRITES.sonu.length + 2; // +1 for Tulip, +1 for Background
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

        // Load Background
        const bgImg = new Image();
        bgImg.onload = checkLoaded;
        bgImg.onerror = () => {
            console.warn("Background image failed to load, using default procedural background.");
            // Even if it fails, we count it as "loaded" (processed) so the game starts
            checkLoaded();
        };
        bgImg.src = SPRITES.background;
        assetsRef.current.background = bgImg;

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
    }, []);

    // 2. Game Loop Effect
    useEffect(() => {
        if (!uiState.loaded) return;

        const canvas = canvasRef.current;
        if (!canvas) {
            console.error("Canvas ref is null despite loaded state");
            return;
        }

        const ctx = canvas.getContext('2d');
        let animationFrameId;
        const images = assetsRef.current;

        const render = () => {
            try {
                const now = Date.now();
                const state = gameRef.current;

                // Dynamic Constants based on current canvas size
                const width = canvas.width;
                const height = canvas.height;
                const GROUND_Y = height * 0.81; // Keep proportionate to background
                const SONU_X = width * 0.75;
                const FLOWER_X = width * 0.375;

                // Safety check for assets
                if (!images || !images.hafi || !images.sonu) return;

                // Draw Background or Fallback
                if (images.background && images.background.complete && images.background.naturalWidth !== 0) {
                    ctx.drawImage(images.background, 0, 0, canvas.width, canvas.height);
                } else {
                    // Fallback: Clear Screen with Gradient Sky
                    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
                    gradient.addColorStop(0, '#87CEEB'); // Sky Blue
                    gradient.addColorStop(1, '#E0F7FA'); // Light Cyan
                    ctx.fillStyle = gradient;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    // Draw Clouds
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
                }

                // --- Game Logic ---

                // 1. Move Hafi
                if (state.hafiX < SONU_X - 60) {
                    state.hafiX += 1.2; // Walking speed

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
                    hafiFrameIndex = Math.floor(now / 250) % images.hafi.length;
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

                // Draw Sonu (Static -> Jump Animation)
                let sonuFrameIndex = 0;
                if (state.sonuState === 'jumping') {
                    sonuFrameIndex = Math.floor(now / 300) % images.sonu.length;
                }
                let sonuY = GROUND_Y - 10;

                if (state.sonuState === 'jumping') {
                    sonuY = (GROUND_Y - 10) - Math.abs(Math.sin(now / 200) * 30);

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
            } catch (e) {
                console.error("Game Loop Error:", e);
                // Try to recover
                animationFrameId = requestAnimationFrame(render);
            }
        };

        render();
        return () => cancelAnimationFrame(animationFrameId);
    }, [uiState.loaded, uiState.isMobileLandscape]);

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
            {/* Remove wrapper size constraints, act as direct frame */}
            <div style={styles.gameWrapper}>
                <canvas ref={canvasRef} width={dimensions.width} height={dimensions.height} style={styles.canvas} />

                {uiState.showPopup && (
                    <div style={styles.overlay}>
                        {!uiState.letterOpen ? (
                            <div
                                style={styles.envelope}
                                onClick={() => setUiState(prev => ({ ...prev, letterOpen: true }))}
                                className="bounce-animation"
                            >
                                <div style={{ fontSize: '80px', marginBottom: '10px' }}>💌</div>
                                <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                                    You have a letter! (Click to Open)
                                </div>
                            </div>
                        ) : (
                            <div style={styles.letterContainer} className="unfold-animation">
                                <div style={styles.letterPaper}>
                                    <p style={styles.letterText}>
                                        "I know it's really late, and I know what we are and what we aren't. But today felt like it was meant for you, and I couldn't shake the feeling that I'd regret it if I didn't reach out. Happy Valentine's Day."
                                    </p>
                                    <div style={{ marginTop: '20px', fontSize: '24px' }}>❤️</div>
                                </div>
                            </div>
                        )}
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
        position: 'fixed',
        top: 0,
        left: 0
    },
    gameWrapper: {
        position: 'relative',
        overflow: 'hidden',
        width: '100vw',
        height: '100vh',
    },
    canvas: {
        display: 'block',
        backgroundColor: '#87CEEB',
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
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 100,
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
        zIndex: 20,
        backdropFilter: 'blur(2px)' // Optional: blur background slightly
    },
    envelope: {
        cursor: 'pointer',
        textAlign: 'center',
        animation: 'bounce 2s infinite',
        transform: 'scale(1)',
        transition: 'transform 0.2s',
    },
    letterContainer: {
        animation: 'unfold 0.8s ease-out forwards',
        perspective: '1000px',
    },
    letterPaper: {
        backgroundColor: '#fffdf0', // Creamy paper color
        padding: '40px',
        borderRadius: '4px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        maxWidth: '600px',
        width: '90%',
        minHeight: '300px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        background: `linear-gradient(to bottom, #fffdf0 0%, #fffdf0 98%, #e0e0e0 100%)`, // Slight curl effect
    },
    letterText: {
        fontFamily: '"Dancing Script", "Brush Script MT", cursive', // Handwritten style font if avail, fallback to cursive
        fontSize: '24px',
        lineHeight: '1.6',
        color: '#4a4a4a',
        textAlign: 'center',
        margin: 0,
    }
};

export default ValentineGame;
