// Tailwind CSS Configuration
tailwind.config = {
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "primary": "#0f6df0",
                "electric-blue": "#00f2ff",
                "deep-navy": "#050A14",
                "surface-dark": "#0F1116",
                "surface-glass": "rgba(15, 23, 42, 0.6)",
            },
            fontFamily: {
                "sans": ["Inter", "sans-serif"],
            },
            backgroundImage: {
                'hero-glow': 'radial-gradient(circle at 50% 0%, rgba(56, 189, 248, 0.15) 0%, rgba(0, 0, 0, 0) 60%)',
                'card-gradient': 'linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)',
            },
            boxShadow: {
                'neon-blue': '0 0 20px -5px rgba(14, 165, 233, 0.5)',
                'neon-purple': '0 0 20px -5px rgba(139, 92, 246, 0.5)',
                'neon-green': '0 0 20px -5px rgba(34, 197, 94, 0.5)',
                'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
            }
        },
    },
}

// You can add additional JavaScript functionality here
// For example: smooth scrolling, button interactions, animations, etc.

document.addEventListener('DOMContentLoaded', function () {
    console.log('AutoSub Landing Page Loaded');

    // Example: Add click handlers for buttons if needed
    // const ctaButtons = document.querySelectorAll('button');
    // ctaButtons.forEach(button => {
    //     button.addEventListener('click', function() {
    //         console.log('Button clicked:', this.textContent);
    //     });
    // });
});
