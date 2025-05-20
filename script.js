document.addEventListener('DOMContentLoaded', () => {
    // Vérifier que firebase est chargé
    if (!window.firebase) {
        console.error('Firebase SDK non chargé. Vérifiez les scripts dans index.html.');
        return;
    }

    // Protection contre le copier-coller
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('copy', (e) => e.preventDefault());
    document.addEventListener('cut', (e) => e.preventDefault());
    document.addEventListener('dragstart', (e) => e.preventDefault());
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && (e.key === 'p' || e.key === 's')) {
            e.preventDefault();
        }
    });

    // Gestion de l'état de l'utilisateur
    const userInfo = document.getElementById('user-info');
    const authForms = document.getElementById('auth-forms');
    const userName = document.getElementById('user-name');
    const userEmail = document.getElementById('user-email');
    const userStatus = document.getElementById('user-status');
    const authError = document.getElementById('auth-error');

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            userInfo.style.display = 'block';
            authForms.style.display = 'none';
            userName.textContent = user.displayName || 'Utilisateur';
            userEmail.textContent = user.email;
            userStatus.textContent = '🔵';
            // Charger les préférences depuis Firestore
            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.exists) {
                    const data = userDoc.data();
                    currentLanguage = data.language || 'fr';
                    fontSize = data.fontSize || 16;
                    volume = data.volume || 100;
                    favorites = data.favorites || [];
                    progress = data.progress || {};
                    document.body.classList.toggle('dark', data.theme === 'dark');
                    updateLanguage();
                    updateFontSize();
                    updateFavoritesList();
                    if (profileLanguage) profileLanguage.value = currentLanguage;
                    if (profileFontSize) profileFontSize.value = fontSize;
                    if (fontSizeValue) fontSizeValue.textContent = `${fontSize}px`;
                    if (profileVolume) profileVolume.value = volume;
                    if (volumeValue) volumeValue.textContent = `${volume}%`;
                    if (themeToggle) themeToggle.querySelector('.icon').textContent = data.theme === 'dark' ? '☀️' : '🌙';
                    if (profileTheme) profileTheme.checked = data.theme === 'dark';
                }
            } catch (error) {
                console.error('Erreur Firestore:', error);
            }
        } else {
            userInfo.style.display = 'none';
            authForms.style.display = 'block';
            userStatus.textContent = '';
            currentLanguage = localStorage.getItem('language') || 'fr';
            fontSize = parseInt(localStorage.getItem('fontSize')) || 16;
            volume = parseInt(localStorage.getItem('volume')) || 100;
            favorites = JSON.parse(localStorage.getItem('favorites')) || [];
            progress = JSON.parse(localStorage.getItem('progress')) || {};
            updateLanguage();
            updateFontSize();
            updateFavoritesList();
        }
    });

    // Gestion de l'inscription
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('signup-name').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            console.log('Inscription:', email);
            try {
                const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
                await userCredential.user.updateProfile({ displayName: name });
                await db.collection('users').doc(userCredential.user.uid).set({
                    language: currentLanguage,
                    theme: document.body.classList.contains('dark') ? 'dark' : 'light',
                    fontSize,
                    volume,
                    favorites,
                    progress
                });
                authError.textContent = '';
                signupForm.reset();
            } catch (error) {
                authError.textContent = error.message;
            }
        });
    }

    // Gestion de la connexion
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            console.log('Connexion:', email);
            try {
                await firebase.auth().signInWithEmailAndPassword(email, password);
                authError.textContent = '';
                loginForm.reset();
            } catch (error) {
                authError.textContent = error.message;
            }
        });
    }

    // Gestion de la déconnexion
    const signOutBtn = document.getElementById('sign-out-btn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', async () => {
            console.log('Déconnexion');
            try {
                await firebase.auth().signOut();
                authError.textContent = '';
            } catch (error) {
                authError.textContent = error.message;
            }
        });
    }

    // Réinitialisation du mot de passe
    const resetPasswordLink = document.getElementById('reset-password');
    if (resetPasswordLink) {
        resetPasswordLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            console.log('Réinitialisation mot de passe:', email);
            if (!email) {
                authError.textContent = 'Veuillez entrer votre e-mail.';
                return;
            }
            try {
                await firebase.auth().sendPasswordResetEmail(email);
                authError.textContent = 'E-mail de réinitialisation envoyé !';
            } catch (error) {
                authError.textContent = error.message;
            }
        });
    }

    // Gestion du mode sombre/clair
    const themeToggle = document.getElementById('theme-toggle');
    const profileTheme = document.getElementById('profile-theme');
    if (themeToggle && profileTheme) {
        themeToggle.addEventListener('click', () => {
            console.log('Clic mode sombre');
            toggleTheme();
        });
        profileTheme.addEventListener('change', () => {
            console.log('Changement thème profil');
            toggleTheme();
        });
    }

    async function toggleTheme() {
        document.body.classList.toggle('dark');
        const isDark = document.body.classList.contains('dark');
        if (themeToggle) themeToggle.querySelector('.icon').textContent = isDark ? '☀️' : '🌙';
        if (profileTheme) profileTheme.checked = isDark;
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        if (firebase.auth().currentUser) {
            try {
                await db.collection('users').doc(firebase.auth().currentUser.uid).update({ theme: isDark ? 'dark' : 'light' });
            } catch (error) {
                console.error('Erreur mise à jour thème:', error);
            }
        }
    }

    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark');
        if (themeToggle) themeToggle.querySelector('.icon').textContent = '☀️';
        if (profileTheme) profileTheme.checked = true;
    }

    // Gestion de la taille de la police
    let fontSize = parseInt(localStorage.getItem('fontSize')) || 16;
    const profileFontSize = document.getElementById('profile-font-size');
    const fontSizeValue = document.getElementById('font-size-value');
    if (profileFontSize && fontSizeValue) {
        profileFontSize.value = fontSize;
        fontSizeValue.textContent = `${fontSize}px`;
        profileFontSize.addEventListener('input', async () => {
            console.log('Changement taille police');
            fontSize = parseInt(profileFontSize.value);
            fontSizeValue.textContent = `${fontSize}px`;
            updateFontSize();
            localStorage.setItem('fontSize', fontSize);
            if (firebase.auth().currentUser) {
                try {
                    await db.collection('users').doc(firebase.auth().currentUser.uid).update({ fontSize });
                } catch (error) {
                    console.error('Erreur mise à jour police:', error);
                }
            }
        });
    }

    function updateFontSize() {
        document.querySelectorAll('section, section *').forEach(element => {
            element.style.fontSize = `${fontSize}px`;
        });
        document.querySelectorAll('.prev-btn, .next-btn, .close-btn, .favorite').forEach(element => {
            element.style.fontSize = `${fontSize * 0.9}px`;
        });
    }

    updateFontSize();

    // Gestion du volume de la lecture vocale
    let volume = parseInt(localStorage.getItem('volume')) || 100;
    const profileVolume = document.getElementById('profile-volume');
    const volumeValue = document.getElementById('volume-value');
    if (profileVolume && volumeValue) {
        profileVolume.value = volume;
        volumeValue.textContent = `${volume}%`;
        profileVolume.addEventListener('input', async () => {
            console.log('Changement volume');
            volume = parseInt(profileVolume.value);
            volumeValue.textContent = `${volume}%`;
            localStorage.setItem('volume', volume);
            if (currentSpeech) {
                currentSpeech.volume = volume / 100;
            }
            if (firebase.auth().currentUser) {
                try {
                    await db.collection('users').doc(firebase.auth().currentUser.uid).update({ volume });
                } catch (error) {
                    console.error('Erreur mise à jour volume:', error);
                }
            }
        });
    }

    // Gestion de la langue
    let currentLanguage = localStorage.getItem('language') || 'fr';
    const languageToggle = document.getElementById('language-toggle');
    const profileLanguage = document.getElementById('profile-language');
    if (languageToggle && profileLanguage) {
        profileLanguage.value = currentLanguage;
        languageToggle.addEventListener('click', async () => {
            console.log('Clic langue');
            currentLanguage = currentLanguage === 'fr' ? 'en' : currentLanguage === 'en' ? 'ar' : 'fr';
            await updateLanguage();
        });
        profileLanguage.addEventListener('change', async () => {
            console.log('Changement langue profil');
            currentLanguage = profileLanguage.value;
            await updateLanguage();
        });
    }

    async function updateLanguage() {
        document.querySelectorAll('.content').forEach(content => {
            content.style.display = content.dataset.lang === currentLanguage ? 'block' : 'none';
        });
        localStorage.setItem('language', currentLanguage);
        if (profileLanguage) profileLanguage.value = currentLanguage;
        if (firebase.auth().currentUser) {
            try {
                await db.collection('users').doc(firebase.auth().currentUser.uid).update({ language: currentLanguage });
            } catch (error) {
                console.error('Erreur mise à jour langue:', error);
            }
        }
    }

    updateLanguage();

    // Navigation entre sections
    const sections = document.querySelectorAll('section');
    const homeButton = document.getElementById('home-btn');
    const menuButton = document.getElementById('menu-btn');
    const startButton = document.getElementById('start-btn');
    const profileButton = document.getElementById('profile-btn');
    const closeButtons = document.querySelectorAll('.close-btn');

    if (homeButton) {
        homeButton.addEventListener('click', () => {
            console.log('Clic accueil');
            goToHome();
        });
    }
    if (menuButton) {
        menuButton.addEventListener('click', () => {
            console.log('Clic sommaire');
            sections.forEach(section => section.classList.remove('active'));
            document.getElementById('table-of-contents').classList.add('active');
        });
    }
    if (startButton) {
        startButton.addEventListener('click', () => {
            console.log('Clic commencer');
            sections.forEach(section => section.classList.remove('active'));
            document.getElementById('table-of-contents').classList.add('active');
        });
    }
    if (profileButton) {
        profileButton.addEventListener('click', () => {
            console.log('Clic profil');
            sections.forEach(section => section.classList.remove('active'));
            document.getElementById('profile').classList.add('active');
        });
    }
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            console.log('Clic fermer');
            goToHome();
        });
    });

    function goToHome() {
        sections.forEach(section => section.classList.remove('active'));
        document.getElementById('home').classList.add('active');
    }

    const links = document.querySelectorAll('#chapter-list a, #favorites-list a');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Clic lien chapitre');
            const targetId = link.getAttribute('href').substring(1);
            sections.forEach(section => section.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Navigation entre chapitres
    const chapters = ['chapter1', 'chapter2', 'chapter3', 'chapter4', 'chapter5'];
    const prevButtons = document.querySelectorAll('.prev-btn');
    const nextButtons = document.querySelectorAll('.next-btn');

    prevButtons.forEach(button => {
        button.addEventListener('click', () => {
            console.log('Clic précédent');
            const currentChapter = button.closest('section').id;
            const currentIndex = chapters.indexOf(currentChapter);
            if (currentIndex > 0) {
                sections.forEach(section => section.classList.remove('active'));
                document.getElementById(chapters[currentIndex - 1]).classList.add('active');
            }
        });
    });

    nextButtons.forEach(button => {
        button.addEventListener('click', () => {
            console.log('Clic suivant');
            const currentChapter = button.closest('section').id;
            const currentIndex = chapters.indexOf(currentChapter);
            if (currentIndex < chapters.length - 1) {
                sections.forEach(section => section.classList.remove('active'));
                document.getElementById(chapters[currentIndex + 1]).classList.add('active');
            }
        });
    });

    // Gestion des favoris et progression
    let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    let progress = JSON.parse(localStorage.getItem('progress')) || {};
    const favoriteStars = document.querySelectorAll('.favorite');

    async function updateFavoritesList() {
        const favoritesList = document.getElementById('favorites-list');
        if (favoritesList) {
            favoritesList.innerHTML = '';
            favorites.forEach(chapterId => {
                const chapterTitle = document.getElementById(chapterId).querySelector('h2').textContent;
                const progressPercent = progress[chapterId] || 0;
                const li = document.createElement('li');
                li.innerHTML = `
                    <a href="#${chapterId}">${chapterTitle}</a>
                    <div class="progress-bar">
                        <div class="progress" style="width: ${progressPercent}%"></div>
                    </div>
                `;
                favoritesList.appendChild(li);
            });
            document.querySelectorAll('#favorites-list a').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('Clic favori');
                    const targetId = link.getAttribute('href').substring(1);
                    sections.forEach(section => section.classList.remove('active'));
                    document.getElementById(targetId).classList.add('active');
                });
            });
            if (firebase.auth().currentUser) {
                try {
                    await db.collection('users').doc(firebase.auth().currentUser.uid).update({ favorites });
                } catch (error) {
                    console.error('Erreur mise à jour favoris:', error);
                }
            }
        }
    }

    favoriteStars.forEach(star => {
        const chapterId = star.dataset.chapter;
        if (favorites.includes(chapterId)) {
            star.classList.add('active');
            star.textContent = '★';
        }
        star.addEventListener('click', async () => {
            console.log('Clic favori étoile');
            if (!favorites.includes(chapterId)) {
                favorites.push(chapterId);
                star.classList.add('active');
                star.textContent = '★';
            } else {
                favorites = favorites.filter(id => id !== chapterId);
                star.classList.remove('active');
                star.textContent = '⭐';
            }
            localStorage.setItem('favorites', JSON.stringify(favorites));
            await updateFavoritesList();
        });
    });

    const favoritesButton = document.getElementById('favorites-btn');
    if (favoritesButton) {
        favoritesButton.addEventListener('click', () => {
            console.log('Clic favoris');
            sections.forEach(section => section.classList.remove('active'));
            document.getElementById('favorites').classList.add('active');
        });
    }

    async function trackProgress() {
        const activeSection = document.querySelector('section.active');
        if (!activeSection || !activeSection.classList.contains('chapter') || activeSection.id === 'favorites' || activeSection.id === 'table-of-contents' || activeSection.id === 'profile') return;

        const chapterId = activeSection.id;
        const content = activeSection.querySelector('.content');
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const contentHeight = content.scrollHeight - window.innerHeight;
        const progressPercent = contentHeight > 0 ? Math.min(100, (scrollTop / contentHeight) * 100) : 100;

        progress[chapterId] = Math.max(progress[chapterId] || 0, progressPercent);
        localStorage.setItem('progress', JSON.stringify(progress));
        await updateFavoritesList();
        if (firebase.auth().currentUser) {
            try {
                await db.collection('users').doc(firebase.auth().currentUser.uid).update({ progress });
            } catch (error) {
                console.error('Erreur mise à jour progression:', error);
            }
        }
    }

    window.addEventListener('scroll', trackProgress);
    updateFavoritesList();

    // Gestion de la lecture vocale
    const voiceToggle = document.getElementById('voice-toggle');
    const voiceSelect = document.getElementById('voice-select');
    let currentSpeech = null;
    let currentChapter = null;
    let voices = [];

    function populateVoiceList() {
        voices = speechSynthesis.getVoices();
        if (voiceSelect) {
            voiceSelect.innerHTML = '<option value="">Voix par défaut</option>';
            let voiceCounter = 1;
            voices.forEach((voice, index) => {
                if (voice.lang.startsWith('fr') || voice.lang.startsWith('en') || voice.lang.startsWith('ar')) {
                    const option = document.createElement('option');
                    option.value = index;
                    option.textContent = `Voix ${voiceCounter} (${voice.lang})`;
                    voiceSelect.appendChild(option);
                    voiceCounter++;
                }
            });
        }
    }

    speechSynthesis.onvoiceschanged = populateVoiceList;
    populateVoiceList();

    if (voiceToggle) {
        voiceToggle.addEventListener('click', () => {
            console.log('Clic lecture vocale');
            const activeSection = document.querySelector('section.active');
            if (!activeSection || activeSection.id === 'home' || activeSection.id === 'favorites' || activeSection.id === 'table-of-contents' || activeSection.id === 'profile') return;

            const chapterId = activeSection.id;
            const content = activeSection.querySelector(`.content[data-lang="${currentLanguage}"]`);
            const text = Array.from(content.querySelectorAll('p')).map(p => p.textContent).join(' ');

            if (currentSpeech && currentChapter === chapterId && !speechSynthesis.paused) {
                speechSynthesis.pause();
                currentSpeech.paused = true;
                voiceToggle.querySelector('.icon').textContent = '▶️';
            } else if (currentSpeech && currentSpeech.paused) {
                speechSynthesis.resume();
                currentSpeech.paused = false;
                voiceToggle.querySelector('.icon').textContent = '⏸️';
            } else {
                if (currentSpeech) {
                    speechSynthesis.cancel();
                }
                currentSpeech = new SpeechSynthesisUtterance(text);
                currentSpeech.lang = currentLanguage === 'fr' ? 'fr-FR' : currentLanguage === 'en' ? 'en-US' : 'ar-SA';
                currentSpeech.volume = volume / 100;
                if (voiceSelect.value) {
                    currentSpeech.voice = voices[parseInt(voiceSelect.value)];
                }
                currentSpeech.paused = false;
                currentChapter = chapterId;
                speechSynthesis.speak(currentSpeech);
                voiceToggle.querySelector('.icon').textContent = '⏸️';
                currentSpeech.onend = () => {
                    voiceToggle.querySelector('.icon').textContent = '🔊';
                    currentSpeech = null;
                    currentChapter = null;
                };
            }
        });
    }
});
