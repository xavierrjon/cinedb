const API_BASE_URL = 'http://localhost:3000/api';

        class MongoDBService {
            constructor() {
                this.isConnected = false;
                this.currentUser = null;
            }

            async connect() {
                try {
                    const response = await fetch(`${API_BASE_URL}/status`);
                    const data = await response.json();
                    
                    if (data.status === 'connected') {
                        this.isConnected = true;
                        return { success: true, message: 'Conectado ao MongoDB com sucesso!', data };
                    } else {
                        return { success: false, message: 'Erro ao conectar com a API' };
                    }
                } catch (error) {
                    return { success: false, message: 'Erro ao conectar com o servidor: ' + error.message };
                }
            }

            async register(userData) {
                const response = await fetch(`${API_BASE_URL}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData)
                });
                return await response.json();
            }

            async login(credentials) {
                const response = await fetch(`${API_BASE_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(credentials)
                });
                return await response.json();
            }

            async getMovies(userId, options = {}) {
                const params = new URLSearchParams({ userId });
                if (options.search) params.append('search', options.search);
                if (options.favorites) params.append('favorites', options.favorites);
                
                const response = await fetch(`${API_BASE_URL}/movies?${params}`);
                return await response.json();
            }

            async getPublicMovies(options = {}) {
                const params = new URLSearchParams();
                if (options.search) params.append('search', options.search);
                if (options.userId) params.append('userId', options.userId);
                
                const response = await fetch(`${API_BASE_URL}/movies/public?${params}`);
                return await response.json();
            }

            async toggleFavorite(movieId) {
                const currentUser = this.getCurrentUser();
                const response = await fetch(`${API_BASE_URL}/movies/${movieId}/toggle-favorite`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: currentUser._id })
                });
                return await response.json();
            }

            async addMovie(movieData) {
                const response = await fetch(`${API_BASE_URL}/movies`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(movieData)
                });
                return await response.json();
            }

            async updateMovie(movieId, updates) {
                const response = await fetch(`${API_BASE_URL}/movies/${movieId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updates)
                });
                return await response.json();
            }

            async deleteMovie(movieId) {
                const response = await fetch(`${API_BASE_URL}/movies/${movieId}`, {
                    method: 'DELETE'
                });
                return await response.json();
            }

            async getUserStats(userId) {
                const response = await fetch(`${API_BASE_URL}/user/${userId}/stats`);
                return await response.json();
            }

            setCurrentUser(user) {
                this.currentUser = user;
                localStorage.setItem('currentUser', JSON.stringify(user));
            }

            getCurrentUser() {
                if (!this.currentUser) {
                    const userStr = localStorage.getItem('currentUser');
                    this.currentUser = userStr ? JSON.parse(userStr) : null;
                }
                return this.currentUser;
            }

            logout() {
                this.currentUser = null;
                localStorage.removeItem('currentUser');
            }
        }

        class MovieApp {
            constructor() {
                this.db = new MongoDBService();
                this.currentSection = 'config';
                this.init();
            }

            init() {
                this.bindEvents();
                this.checkPreviousConnection();
            }

            bindEvents() {
                document.getElementById('connect-api').addEventListener('click', () => this.connectToAPI());
                
                document.querySelectorAll('.nav-link').forEach(link => {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.showSection(e.target.getAttribute('data-section'));
                    });
                });
                
                document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
                document.getElementById('register-form').addEventListener('submit', (e) => this.handleRegister(e));
                document.getElementById('add-movie-form').addEventListener('submit', (e) => this.handleAddMovie(e));
                document.getElementById('edit-movie-form').addEventListener('submit', (e) => this.handleEditMovie(e));
                
                document.getElementById('show-register').addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showSection('register');
                });
                
                document.getElementById('show-login').addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showSection('login');
                });
                
                document.getElementById('logout-btn').addEventListener('click', () => this.handleLogout());
                
                document.getElementById('search-movie').addEventListener('input', (e) => {
                    this.searchMovies(e.target.value);
                });
                
                document.getElementById('search-public-movie').addEventListener('input', (e) => {
                    this.searchPublicMovies(e.target.value);
                });
                
                document.getElementById('refresh-stats').addEventListener('click', () => this.loadStats());
                
                document.querySelector('.close-modal').addEventListener('click', () => this.hideEditModal());
                document.getElementById('cancel-edit').addEventListener('click', () => this.hideEditModal());
                document.getElementById('edit-movie-modal').addEventListener('click', (e) => {
                    if (e.target.id === 'edit-movie-modal') this.hideEditModal();
                });
            }

            async connectToAPI() {
                const connectBtn = document.getElementById('connect-api');
                connectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Conectando...';
                connectBtn.disabled = true;

                try {
                    const result = await this.db.connect();
                    
                    if (result.success) {
                        this.showAlert(result.message, 'success');
                        document.getElementById('db-status').innerHTML = '<i class="fas fa-database"></i> MongoDB Real';
                        document.getElementById('system-status').innerHTML = 
                            `✅ <strong>Conectado com sucesso!</strong><br>
                             Banco: <code>${result.data.database}</code><br>
                             Collections: ${result.data.collections.join(', ')}<br>
                             Usuários: ${result.data.stats.users} | Filmes: ${result.data.stats.movies} | Públicos: ${result.data.stats.publicMovies}<br>
                             Total de Favoritos: ${result.data.stats.totalFavorites}`;
                        this.showSection('login');
                    } else {
                        this.showAlert(result.message, 'error');
                        document.getElementById('db-status').innerHTML = '<i class="fas fa-database"></i> Sistema Offline';
                        document.getElementById('db-status').classList.add('offline');
                        document.getElementById('system-status').innerHTML = '❌ <strong>Erro na conexão</strong><br>Verifique se o backend está rodando.';
                    }
                } catch (error) {
                    this.showAlert('Erro na conexão: ' + error.message, 'error');
                } finally {
                    connectBtn.innerHTML = '<i class="fas fa-plug"></i> Conectar ao Sistema';
                    connectBtn.disabled = false;
                }
            }

            checkPreviousConnection() {
                const currentUser = this.db.getCurrentUser();
                if (currentUser) {
                    this.db.isConnected = true;
                    this.showApp(currentUser);
                }
            }

            showSection(sectionName) {
                document.querySelectorAll('.section').forEach(section => {
                    section.classList.remove('active');
                });
                
                document.getElementById(`${sectionName}-section`).classList.add('active');
                
                document.querySelectorAll('.nav-link').forEach(link => {
                    link.classList.remove('active');
                });
                
                const navLink = document.querySelector(`[data-section="${sectionName}"]`);
                if (navLink) navLink.classList.add('active');
                
                this.currentSection = sectionName;
                
                if (sectionName === 'movies') {
                    this.loadMovies();
                } else if (sectionName === 'public-movies') {
                    this.loadPublicMovies();
                } else if (sectionName === 'favorites') {
                    this.loadFavorites();
                } else if (sectionName === 'home') {
                    this.loadStats();
                }
            }

            showApp(user) {
                document.getElementById('username-display').textContent = user.name;
                document.getElementById('config-section').classList.remove('active');
                document.getElementById('login-section').classList.remove('active');
                document.getElementById('register-section').classList.remove('active');
                document.getElementById('main-nav').classList.remove('hidden');
                document.getElementById('user-info').classList.remove('hidden');
                this.showSection('home');
            }

            async handleLogin(e) {
                e.preventDefault();
                
                const email = document.getElementById('login-email').value;
                const password = document.getElementById('login-password').value;

                try {
                    if (!this.db.isConnected) {
                        this.showAlert('Conecte-se ao sistema primeiro', 'error');
                        return;
                    }

                    const result = await this.db.login({ email, password });
                    
                    if (result.user) {
                        this.db.setCurrentUser(result.user);
                        this.showApp(result.user);
                        this.showAlert(result.message, 'success');
                    } else {
                        this.showAlert(result.error, 'error');
                    }
                } catch (error) {
                    this.showAlert('Erro no login: ' + error.message, 'error');
                }
            }

            async handleRegister(e) {
                e.preventDefault();
                
                const name = document.getElementById('register-name').value;
                const email = document.getElementById('register-email').value;
                const password = document.getElementById('register-password').value;

                try {
                    if (!this.db.isConnected) {
                        this.showAlert('Conecte-se ao sistema primeiro', 'error');
                        return;
                    }

                    const result = await this.db.register({ name, email, password });
                    
                    if (result.user) {
                        this.showAlert(result.message, 'success');
                        this.showSection('login');
                        document.getElementById('register-form').reset();
                    } else {
                        this.showAlert(result.error, 'error');
                    }
                } catch (error) {
                    this.showAlert('Erro no cadastro: ' + error.message, 'error');
                }
            }

            async handleAddMovie(e) {
                e.preventDefault();
                
                if (!this.db.isConnected) {
                    this.showAlert('Conecte-se ao sistema primeiro', 'error');
                    return;
                }

                const title = document.getElementById('movie-title').value;
                const year = document.getElementById('movie-year').value;
                const genre = document.getElementById('movie-genre').value;
                const director = document.getElementById('movie-director').value;
                const synopsis = document.getElementById('movie-synopsis').value;
                const trailer = document.getElementById('movie-trailer').value;
                const favorite = document.getElementById('movie-favorite').checked;
                const isPublic = document.getElementById('movie-public').checked;

                const ratingInput = document.querySelector('input[name="rating"]:checked');
                const rating = ratingInput ? parseInt(ratingInput.value) : null;

                const genres = genre ? genre.split(',').map(g => g.trim()) : [];
                const currentUser = this.db.getCurrentUser();

                const movieData = {
                    title,
                    year: year ? parseInt(year) : null,
                    genres,
                    director: director || null,
                    synopsis: synopsis || null,
                    trailer: trailer || null,
                    rating,
                    favorite,
                    isPublic,
                    userId: currentUser._id
                };

                try {
                    const result = await this.db.addMovie(movieData);
                    
                    if (result.message) {
                        this.showAlert(result.message, 'success');
                        document.getElementById('add-movie-form').reset();
                        
                        document.querySelectorAll('input[name="rating"]').forEach(input => {
                            input.checked = false;
                        });

                        if (this.currentSection === 'movies') {
                            this.loadMovies();
                        } else if (this.currentSection === 'public-movies') {
                            this.loadPublicMovies();
                        }
                        
                        this.loadStats();
                    } else {
                        this.showAlert(result.error, 'error');
                    }
                } catch (error) {
                    this.showAlert('Erro ao adicionar filme: ' + error.message, 'error');
                }
            }

            async handleEditMovie(e) {
                e.preventDefault();
                
                const movieId = document.getElementById('edit-movie-id').value;
                const title = document.getElementById('edit-movie-title').value;
                const year = document.getElementById('edit-movie-year').value;
                const genre = document.getElementById('edit-movie-genre').value;
                const director = document.getElementById('edit-movie-director').value;
                const synopsis = document.getElementById('edit-movie-synopsis').value;
                const trailer = document.getElementById('edit-movie-trailer').value;
                const favorite = document.getElementById('edit-movie-favorite').checked;
                const isPublic = document.getElementById('edit-movie-public').checked;

                const ratingInput = document.querySelector('input[name="edit-rating"]:checked');
                const rating = ratingInput ? parseInt(ratingInput.value) : null;

                const genres = genre ? genre.split(',').map(g => g.trim()) : [];
                const currentUser = this.db.getCurrentUser();

                const updates = {
                    title,
                    year: year ? parseInt(year) : null,
                    genres,
                    director: director || null,
                    synopsis: synopsis || null,
                    trailer: trailer || null,
                    rating,
                    favorite,
                    isPublic,
                    userId: currentUser._id
                };

                try {
                    const result = await this.db.updateMovie(movieId, updates);
                    
                    if (result.message) {
                        this.showAlert(result.message, 'success');
                        this.hideEditModal();
                        
                        if (this.currentSection === 'movies') {
                            this.loadMovies();
                        } else if (this.currentSection === 'public-movies') {
                            this.loadPublicMovies();
                        } else if (this.currentSection === 'favorites') {
                            this.loadFavorites();
                        }
                        
                        this.loadStats();
                    } else {
                        this.showAlert(result.error, 'error');
                    }
                } catch (error) {
                    this.showAlert('Erro ao atualizar filme: ' + error.message, 'error');
                }
            }

            handleLogout() {
                this.db.logout();
                this.showSection('config');
                document.getElementById('main-nav').classList.add('hidden');
                document.getElementById('user-info').classList.add('hidden');
                this.showAlert('Logout realizado com sucesso!', 'success');
            }

            async loadMovies() {
                try {
                    const currentUser = this.db.getCurrentUser();
                    const movies = await this.db.getMovies(currentUser._id);
                    this.renderMovies(movies, 'movies-container');
                } catch (error) {
                    this.showAlert('Erro ao carregar filmes: ' + error.message, 'error');
                }
            }

            async loadPublicMovies() {
                try {
                    const currentUser = this.db.getCurrentUser();
                    const movies = await this.db.getPublicMovies({ 
                        userId: currentUser._id 
                    });
                    this.renderPublicMovies(movies);
                } catch (error) {
                    this.showAlert('Erro ao carregar filmes públicos: ' + error.message, 'error');
                }
            }

            async loadFavorites() {
                try {
                    const currentUser = this.db.getCurrentUser();
                    const movies = await this.db.getMovies(currentUser._id, { favorites: true });
                    this.renderMovies(movies, 'favorites-container');
                } catch (error) {
                    this.showAlert('Erro ao carregar favoritos: ' + error.message, 'error');
                }
            }

            async loadStats() {
                try {
                    const currentUser = this.db.getCurrentUser();
                    const statsData = await this.db.getUserStats(currentUser._id);
                    
                    const allMovies = await this.db.getMovies(currentUser._id);
                    const myMovies = allMovies.filter(movie => movie.userId === currentUser._id);
                    
                    const averageRating = myMovies.length > 0 
                        ? myMovies.reduce((sum, movie) => sum + (movie.rating || 0), 0) / myMovies.length
                        : 0;

                    const genreCount = {};
                    myMovies.forEach(movie => {
                        if (movie.genres) {
                            movie.genres.forEach(genre => {
                                genreCount[genre] = (genreCount[genre] || 0) + 1;
                            });
                        }
                    });

                    const topGenre = Object.keys(genreCount).length > 0
                        ? Object.keys(genreCount).reduce((a, b) => genreCount[a] > genreCount[b] ? a : b)
                        : 'Nenhum';

                    this.renderStats({
                        totalMovies: statsData.stats.moviesCount,
                        favoriteMovies: statsData.stats.favoritesGiven,
                        averageRating: averageRating.toFixed(1),
                        topGenre,
                        publicMovies: statsData.stats.publicMoviesCount,
                        favoritesReceived: statsData.stats.favoritesReceived,
                        favoritedFromOthers: statsData.stats.favoritedFromOthers
                    });
                } catch (error) {
                    console.error('Erro ao carregar estatísticas:', error);
                }
            }

            renderStats(stats) {
                const container = document.getElementById('stats-container');
                container.innerHTML = `
                    <div class="stat-card">
                        <div class="stat-number">${stats.totalMovies}</div>
                        <div class="stat-label">Meus Filmes</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.favoriteMovies}</div>
                        <div class="stat-label">Filmes Favoritados</div>
                        <small style="color: #ccc; margin-top: 0.5rem; display: block;">
                            ${stats.favoritedFromOthers} de outros usuários
                        </small>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.averageRating}</div>
                        <div class="stat-label">Avaliação Média</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.publicMovies}</div>
                        <div class="stat-label">Filmes Públicos</div>
                        <small style="color: #ccc; margin-top: 0.5rem; display: block;">
                            ${stats.favoritesReceived} favoritos recebidos
                        </small>
                    </div>
                `;
            }

            extractYouTubeId(url) {
                if (!url || typeof url !== 'string') return null;
                
                const patterns = [
                    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
                    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
                    /youtube\.com\/watch\?.*&v=([a-zA-Z0-9_-]{11})/
                ];
                
                for (const pattern of patterns) {
                    const match = url.match(pattern);
                    if (match && match[1]) {
                        return match[1];
                    }
                }
                
                return null;
            }

            renderMovies(movies, containerId) {
                const container = document.getElementById(containerId);
                const currentUser = this.db.getCurrentUser();
                
                if (movies.length === 0) {
                    container.innerHTML = `
                        <div class="empty-state" style="grid-column: 1 / -1;">
                            <i class="fas fa-film"></i>
                            <h3 style="color: var(--secondary); margin-bottom: 1rem;">
                                Nenhum filme encontrado
                            </h3>
                            <p>${containerId === 'favorites-container' ? 'Você ainda não tem filmes favoritos.' : 'Comece adicionando seu primeiro filme!'}</p>
                        </div>
                    `;
                    return;
                }
                
                container.innerHTML = movies.map(movie => {
                    const isOwner = currentUser && movie.userId === currentUser._id;
                    const trailerId = this.extractYouTubeId(movie.trailer);
                    const isFavorited = movie.userFavorited;
                    
                    return `
                    <div class="movie-card" data-movie-id="${movie._id}">
                        <div class="movie-header">
                            <h3 class="movie-title">${movie.title}</h3>
                            <div class="movie-year">
                                <i class="fas fa-calendar"></i> ${movie.year || 'Ano não informado'}
                                ${movie.isPublic ? 
                                    '<span class="movie-badge badge-public"><i class="fas fa-globe"></i> Público</span>' : ''}
                                ${isOwner ? 
                                    '<span class="movie-badge badge-my">Meu</span>' : ''}
                                ${isFavorited ? 
                                    '<span class="movie-badge badge-favorite"><i class="fas fa-heart"></i> Favorito</span>' : ''}
                            </div>
                            
                            ${!isOwner && movie.userName ? `
                            <div class="movie-meta">
                                <div class="movie-added-by">
                                    <div class="user-avatar">${movie.userName.charAt(0).toUpperCase()}</div>
                                    Adicionado por: ${movie.userName}
                                </div>
                                ${movie.favoritesCount > 0 ? `
                                <div class="favorites-count">
                                    <i class="fas fa-heart"></i> ${movie.favoritesCount} 
                                    ${movie.favoritesCount === 1 ? 'favorito' : 'favoritos'}
                                </div>
                                ` : ''}
                            </div>
                            ` : ''}
                        </div>
                        
                        ${trailerId ? `
                        <div class="trailer-container">
                            <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px;">
                                <iframe 
                                    src="https://www.youtube.com/embed/${trailerId}?rel=0"
                                    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowfullscreen>
                                </iframe>
                            </div>
                        </div>
                        ` : movie.trailer ? `
                        <div class="trailer-container">
                            <div class="trailer-placeholder">
                                <i class="fab fa-youtube" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                                <p>Trailer disponível</p>
                                <a href="${movie.trailer}" target="_blank" class="trailer-link">
                                    <i class="fab fa-youtube"></i> Assistir no YouTube
                                </a>
                            </div>
                        </div>
                        ` : ''}
                        
                        <div class="movie-body">
                            <div class="movie-info">
                                ${movie.genres && movie.genres.length > 0 ? 
                                    `<p><strong><i class="fas fa-tags"></i> Gênero:</strong> ${movie.genres.join(', ')}</p>` : ''}
                                ${movie.director ? `<p><strong><i class="fas fa-user"></i> Diretor:</strong> ${movie.director}</p>` : ''}
                                ${movie.rating ? `<p><strong><i class="fas fa-star"></i> Avaliação:</strong> ${'★'.repeat(movie.rating)}${'☆'.repeat(5-movie.rating)}</p>` : ''}
                                ${movie.synopsis ? `<p><strong><i class="fas fa-file-text"></i> Sinopse:</strong> ${movie.synopsis.length > 100 ? movie.synopsis.substring(0, 100) + '...' : movie.synopsis}</p>` : ''}
                            </div>
                            
                            <div class="movie-actions">
                                <button class="action-btn favorite-btn ${isFavorited ? 'active' : ''}" 
                                        onclick="app.toggleFavorite('${movie._id}')">
                                    <i class="fas fa-heart"></i> ${isFavorited ? 'Desfavoritar' : 'Favoritar'}
                                    ${movie.favoritesCount > 0 ? ` (${movie.favoritesCount})` : ''}
                                </button>
                                
                                ${isOwner ? `
                                <button class="action-btn edit-btn" onclick="app.showEditModal('${movie._id}')">
                                    <i class="fas fa-edit"></i> Editar
                                </button>
                                <button class="action-btn delete-btn" onclick="app.deleteMovie('${movie._id}')">
                                    <i class="fas fa-trash"></i> Excluir
                                </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    `;
                }).join('');
            }

            renderPublicMovies(movies) {
                const container = document.getElementById('public-movies-container');
                const currentUser = this.db.getCurrentUser();
                
                if (movies.length === 0) {
                    container.innerHTML = `
                        <div class="empty-state" style="grid-column: 1 / -1;">
                            <i class="fas fa-globe"></i>
                            <h3 style="color: var(--secondary); margin-bottom: 1rem;">
                                Nenhum filme público encontrado
                            </h3>
                            <p>Seja o primeiro a compartilhar um filme com a comunidade!</p>
                        </div>
                    `;
                    return;
                }
                
                container.innerHTML = movies.map(movie => {
                    const isOwner = currentUser && movie.userId === currentUser._id;
                    const trailerId = this.extractYouTubeId(movie.trailer);
                    const isFavorited = movie.userFavorited;
                    const userInitial = movie.userName ? movie.userName.charAt(0).toUpperCase() : 'U';
                    
                    return `
                    <div class="movie-card" data-movie-id="${movie._id}">
                        <div class="movie-header">
                            <h3 class="movie-title">${movie.title}</h3>
                            <div class="movie-year">
                                <i class="fas fa-calendar"></i> ${movie.year || 'Ano não informado'}
                                <span class="movie-badge badge-public">
                                    <i class="fas fa-globe"></i> Público
                                </span>
                                ${isOwner ? '<span class="movie-badge badge-my">Meu</span>' : ''}
                                ${isFavorited ? '<span class="movie-badge badge-favorite"><i class="fas fa-heart"></i> Favorito</span>' : ''}
                            </div>
                            
                            <div class="movie-meta">
                                <div class="movie-added-by">
                                    <div class="user-avatar">${userInitial}</div>
                                    Adicionado por: ${movie.userName || 'Usuário'}
                                </div>
                                ${movie.favoritesCount > 0 ? `
                                <div class="favorites-count">
                                    <i class="fas fa-heart"></i> ${movie.favoritesCount} 
                                    ${movie.favoritesCount === 1 ? 'favorito' : 'favoritos'}
                                </div>
                                ` : ''}
                            </div>
                        </div>
                        
                        ${trailerId ? `
                        <div class="trailer-container">
                            <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px;">
                                <iframe 
                                    src="https://www.youtube.com/embed/${trailerId}?rel=0"
                                    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;"
                                    allowfullscreen>
                                </iframe>
                            </div>
                        </div>
                        ` : movie.trailer ? `
                        <div class="trailer-container">
                            <div class="trailer-placeholder">
                                <i class="fab fa-youtube" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                                <p>Trailer disponível</p>
                                <a href="${movie.trailer}" target="_blank" class="trailer-link">
                                    <i class="fab fa-youtube"></i> Assistir no YouTube
                                </a>
                            </div>
                        </div>
                        ` : ''}
                        
                        <div class="movie-body">
                            <div class="movie-info">
                                ${movie.genres && movie.genres.length > 0 ? 
                                    `<p><strong><i class="fas fa-tags"></i> Gênero:</strong> ${movie.genres.join(', ')}</p>` : ''}
                                ${movie.director ? `<p><strong><i class="fas fa-user"></i> Diretor:</strong> ${movie.director}</p>` : ''}
                                ${movie.rating ? `<p><strong><i class="fas fa-star"></i> Avaliação:</strong> ${'★'.repeat(movie.rating)}${'☆'.repeat(5-movie.rating)}</p>` : ''}
                                ${movie.synopsis ? `<p><strong><i class="fas fa-file-text"></i> Sinopse:</strong> ${movie.synopsis.length > 150 ? movie.synopsis.substring(0, 150) + '...' : movie.synopsis}</p>` : ''}
                            </div>
                            
                            <div class="movie-actions">
                                <button class="action-btn favorite-btn ${isFavorited ? 'active' : ''}" 
                                        onclick="app.toggleFavorite('${movie._id}')">
                                    <i class="fas fa-heart"></i> ${isFavorited ? 'Desfavoritar' : 'Favoritar'}
                                    ${movie.favoritesCount > 0 ? ` (${movie.favoritesCount})` : ''}
                                </button>
                                
                                ${isOwner ? `
                                <button class="action-btn edit-btn" onclick="app.showEditModal('${movie._id}')">
                                    <i class="fas fa-edit"></i> Editar
                                </button>
                                <button class="action-btn delete-btn" onclick="app.deleteMovie('${movie._id}')">
                                    <i class="fas fa-trash"></i> Excluir
                                </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    `;
                }).join('');
            }

            async toggleFavorite(movieId) {
                try {
                    const result = await this.db.toggleFavorite(movieId);
                    
                    if (result.message) {
                        this.showAlert(result.message, 'success');
                        
                        if (this.currentSection === 'movies') {
                            this.loadMovies();
                        } else if (this.currentSection === 'favorites') {
                            this.loadFavorites();
                        } else if (this.currentSection === 'public-movies') {
                            this.loadPublicMovies();
                        }
                        
                        this.loadStats();
                    } else {
                        this.showAlert(result.error, 'error');
                    }
                } catch (error) {
                    this.showAlert('Erro ao atualizar favorito: ' + error.message, 'error');
                }
            }

            async showEditModal(movieId) {
                try {
                    const currentUser = this.db.getCurrentUser();
                    const movies = await this.db.getMovies(currentUser._id);
                    const movie = movies.find(m => m._id === movieId);
                    
                    if (movie) {
                        document.getElementById('edit-movie-id').value = movie._id;
                        document.getElementById('edit-movie-title').value = movie.title;
                        document.getElementById('edit-movie-year').value = movie.year || '';
                        document.getElementById('edit-movie-genre').value = movie.genres ? movie.genres.join(', ') : '';
                        document.getElementById('edit-movie-director').value = movie.director || '';
                        document.getElementById('edit-movie-synopsis').value = movie.synopsis || '';
                        document.getElementById('edit-movie-trailer').value = movie.trailer || '';
                        document.getElementById('edit-movie-favorite').checked = movie.favorite || false;
                        document.getElementById('edit-movie-public').checked = movie.isPublic || false;
                        
                        document.querySelectorAll('input[name="edit-rating"]').forEach(input => {
                            input.checked = parseInt(input.value) === movie.rating;
                        });
                        
                        document.getElementById('edit-movie-modal').classList.add('active');
                    }
                } catch (error) {
                    this.showAlert('Erro ao carregar filme: ' + error.message, 'error');
                }
            }

            hideEditModal() {
                document.getElementById('edit-movie-modal').classList.remove('active');
            }

            async deleteMovie(movieId) {
                if (confirm('Tem certeza que deseja excluir este filme?')) {
                    try {
                        const result = await this.db.deleteMovie(movieId);
                        
                        if (result.message) {
                            this.showAlert(result.message, 'success');
                            
                            if (this.currentSection === 'movies') {
                                this.loadMovies();
                            } else if (this.currentSection === 'favorites') {
                                this.loadFavorites();
                            } else if (this.currentSection === 'public-movies') {
                                this.loadPublicMovies();
                            }
                            
                            this.loadStats();
                        } else {
                            this.showAlert(result.error, 'error');
                        }
                    } catch (error) {
                        this.showAlert('Erro ao excluir filme: ' + error.message, 'error');
                    }
                }
            }

            async searchMovies(query) {
                try {
                    const currentUser = this.db.getCurrentUser();
                    const results = await this.db.getMovies(currentUser._id, { 
                        search: query
                    });
                    this.renderMovies(results, 'movies-container');
                } catch (error) {
                    this.showAlert('Erro na busca: ' + error.message, 'error');
                }
            }

            async searchPublicMovies(query) {
                try {
                    const currentUser = this.db.getCurrentUser();
                    const results = await this.db.getPublicMovies({ 
                        search: query,
                        userId: currentUser._id 
                    });
                    this.renderPublicMovies(results);
                } catch (error) {
                    this.showAlert('Erro na busca: ' + error.message, 'error');
                }
            }

            showAlert(message, type) {
                const existingAlerts = document.querySelectorAll('.alert');
                existingAlerts.forEach(alert => alert.remove());
                
                const alert = document.createElement('div');
                alert.className = `alert alert-${type === 'error' ? 'error' : 'success'}`;
                alert.innerHTML = `
                    <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : 'check-circle'}"></i>
                    ${message}
                `;
                
                document.querySelector('main').prepend(alert);
                
                setTimeout(() => {
                    alert.remove();
                }, 5000);
            }
        }

        // Inicializar a aplicação
        const app = new MovieApp();