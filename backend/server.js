const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3000;
const MONGODB_URI = 'mongodb://localhost:27017/cineDB';

console.log('🚀 Iniciando servidor...');
console.log('📊 MongoDB URI:', MONGODB_URI);
console.log('🔌 Porta:', PORT);

app.use(cors());
app.use(express.json());

let db;
let client;

async function connectToMongoDB() {
    try {
        console.log('🔗 Conectando ao MongoDB...');
        console.log('📡 URI usada:', MONGODB_URI);
        
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        db = client.db();
        console.log('✅ Conectado ao MongoDB com sucesso!');
        
        await db.createCollection('users');
        await db.createCollection('movies');
        
        await db.collection('users').createIndex({ email: 1 }, { unique: true });
        await db.collection('movies').createIndex({ userId: 1 });
        await db.collection('movies').createIndex({ isPublic: 1 });
        await db.collection('movies').createIndex({ userId: 1, isPublic: 1 });
        await db.collection('movies').createIndex({ title: 'text' });
        await db.collection('movies').createIndex({ favoritedBy: 1 });
        
        console.log('📁 Coleções e índices criados!');
        
    } catch (error) {
        console.error('❌ Erro ao conectar com MongoDB:', error.message);
        console.error('💡 Dica: Verifique se o MongoDB está rodando (execute "mongod" em outro terminal)');
        process.exit(1);
    }
}

// ========== USUÁRIOS ==========
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        const existingUser = await db.collection('users').findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'E-mail já cadastrado' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = {
            name,
            email,
            password: hashedPassword,
            createdAt: new Date()
        };
        
        const result = await db.collection('users').insertOne(newUser);
        
        res.status(201).json({
            message: 'Usuário cadastrado com sucesso',
            user: {
                _id: result.insertedId,
                name: newUser.name,
                email: newUser.email
            }
        });
        
    } catch (error) {
        console.error('Erro no registro:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await db.collection('users').findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'E-mail ou senha incorretos' });
        }
        
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'E-mail ou senha incorretos' });
        }
        
        res.json({
            message: 'Login realizado com sucesso',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email
            }
        });
        
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ========== FILMES ==========

app.get('/api/movies', async (req, res) => {
    try {
        const { userId, search, favorites, includePublic } = req.query;
        
        let query = {};
        
        // SEMPRE incluir filmes públicos quando tiver userId
        if (userId) {
            query = {
                $or: [
                    { userId: userId },
                    { isPublic: true }
                ]
            };
        } else {
            // Sem userId, apenas filmes públicos
            query.isPublic = true;
        }
        
        if (search && search.trim() !== '') {
            query.title = { $regex: search, $options: 'i' };
        }
        
        // Filtro de favoritos: filmes favoritados pelo usuário
        if (favorites === 'true' && userId) {
            query.favoritedBy = userId;
        }
        
        const movies = await db.collection('movies')
            .find(query)
            .sort({ createdAt: -1 })
            .toArray();
        
        // Adicionar info do usuário e verificar se o usuário atual favoritou
        const moviesWithUserInfo = await Promise.all(movies.map(async (movie) => {
            // Info do usuário que adicionou (para filmes não do usuário atual)
            if (movie.userId && movie.userId !== userId) {
                try {
                    const user = await db.collection('users').findOne(
                        { _id: new ObjectId(movie.userId) },
                        { projection: { name: 1, email: 1 } }
                    );
                    if (user) {
                        movie.userName = user.name;
                        movie.userEmail = user.email;
                    }
                } catch (err) {
                    console.error('Erro ao buscar info do usuário:', err);
                }
            }
            
            // Verificar se o usuário atual favoritou este filme
            movie.userFavorited = movie.favoritedBy?.includes(userId) || false;
            movie.favoritesCount = movie.favoritedBy?.length || 0;
            
            return movie;
        }));
        
        res.json(moviesWithUserInfo);
        
    } catch (error) {
        console.error('Erro ao buscar filmes:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.get('/api/movies/public', async (req, res) => {
    try {
        const { search, userId } = req.query;
        
        let query = { isPublic: true };
        
        if (search && search.trim() !== '') {
            query.title = { $regex: search, $options: 'i' };
        }
        
        const movies = await db.collection('movies')
            .find(query)
            .sort({ createdAt: -1 })
            .toArray();
        
        const moviesWithUserInfo = await Promise.all(movies.map(async (movie) => {
            if (movie.userId) {
                try {
                    const user = await db.collection('users').findOne(
                        { _id: new ObjectId(movie.userId) },
                        { projection: { name: 1, email: 1 } }
                    );
                    if (user) {
                        movie.userName = user.name;
                        movie.userEmail = user.email;
                    }
                } catch (err) {
                    console.error('Erro ao buscar info do usuário:', err);
                }
            }
            
            // Verificar se o usuário atual favoritou
            movie.userFavorited = movie.favoritedBy?.includes(userId) || false;
            movie.favoritesCount = movie.favoritedBy?.length || 0;
            
            return movie;
        }));
        
        res.json(moviesWithUserInfo);
        
    } catch (error) {
        console.error('Erro ao buscar filmes públicos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.post('/api/movies', async (req, res) => {
    try {
        const movieData = {
            ...req.body,
            favoritedBy: [],
            trailerId: extractYouTubeId(req.body.trailer),
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const result = await db.collection('movies').insertOne(movieData);
        
        res.status(201).json({
            message: 'Filme adicionado com sucesso',
            movie: {
                _id: result.insertedId,
                ...movieData
            }
        });
        
    } catch (error) {
        console.error('Erro ao adicionar filme:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ROTA PARA FAVORITAR/DESFAVORITAR
app.post('/api/movies/:id/toggle-favorite', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: 'ID do usuário é obrigatório' });
        }
        
        const movie = await db.collection('movies').findOne(
            { _id: new ObjectId(id) }
        );
        
        if (!movie) {
            return res.status(404).json({ error: 'Filme não encontrado' });
        }
        
        // Qualquer usuário pode favoritar qualquer filme!
        const isFavorited = movie.favoritedBy?.includes(userId);
        
        let updateOperation;
        let message;
        
        if (isFavorited) {
            updateOperation = { $pull: { favoritedBy: userId } };
            message = 'Filme removido dos favoritos';
        } else {
            updateOperation = { $addToSet: { favoritedBy: userId } };
            message = 'Filme adicionado aos favoritos';
        }
        
        await db.collection('movies').updateOne(
            { _id: new ObjectId(id) },
            updateOperation
        );
        
        const updatedMovie = await db.collection('movies').findOne(
            { _id: new ObjectId(id) }
        );
        
        res.json({
            message,
            userFavorited: !isFavorited,
            favoritesCount: updatedMovie.favoritedBy?.length || 0
        });
        
    } catch (error) {
        console.error('Erro ao atualizar favorito:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.put('/api/movies/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = {
            ...req.body,
            trailerId: extractYouTubeId(req.body.trailer),
            updatedAt: new Date()
        };
        
        delete updates.favoritedBy;
        
        const result = await db.collection('movies').updateOne(
            { _id: new ObjectId(id) },
            { $set: updates }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Filme não encontrado' });
        }
        
        res.json({ message: 'Filme atualizado com sucesso' });
        
    } catch (error) {
        console.error('Erro ao atualizar filme:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.delete('/api/movies/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.collection('movies').deleteOne(
            { _id: new ObjectId(id) }
        );
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Filme não encontrado' });
        }
        
        res.json({ message: 'Filme excluído com sucesso' });
        
    } catch (error) {
        console.error('Erro ao excluir filme:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ========== ESTATÍSTICAS ==========
app.get('/api/status', async (req, res) => {
    try {
        const collections = await db.listCollections().toArray();
        const usersCount = await db.collection('users').countDocuments();
        const moviesCount = await db.collection('movies').countDocuments();
        const publicMoviesCount = await db.collection('movies').countDocuments({ isPublic: true });
        
        const moviesWithFavorites = await db.collection('movies').find({ 
            favoritedBy: { $exists: true, $ne: [] } 
        }).toArray();
        
        const totalFavorites = moviesWithFavorites.reduce((sum, movie) => {
            return sum + (movie.favoritedBy?.length || 0);
        }, 0);
        
        res.json({
            status: 'connected',
            database: 'cineDB',
            collections: collections.map(c => c.name),
            stats: {
                users: usersCount,
                movies: moviesCount,
                publicMovies: publicMoviesCount,
                totalFavorites: totalFavorites
            }
        });
        
    } catch (error) {
        res.status(500).json({ 
            status: 'error',
            error: error.message 
        });
    }
});

app.get('/api/user/:id/stats', async (req, res) => {
    try {
        const { id } = req.params;
        
        const moviesCount = await db.collection('movies').countDocuments({ userId: id });
        const publicMoviesCount = await db.collection('movies').countDocuments({ 
            userId: id, 
            isPublic: true 
        });
        
        // Filmes favoritados pelo usuário
        const favoritedMovies = await db.collection('movies').find({
            favoritedBy: id
        }).toArray();
        
        // Filmes do usuário favoritados por outros
        const userMovies = await db.collection('movies').find({ userId: id }).toArray();
        const receivedFavorites = userMovies.reduce((sum, movie) => {
            return sum + (movie.favoritedBy?.length || 0);
        }, 0);
        
        // Filmes de outros usuários favoritados por este usuário
        const favoritedFromOthers = favoritedMovies.filter(movie => 
            movie.userId !== id
        ).length;
        
        res.json({
            stats: {
                moviesCount,
                publicMoviesCount,
                favoritesGiven: favoritedMovies.length,
                favoritesReceived: receivedFavorites,
                favoritedFromOthers: favoritedFromOthers,
                totalFavorites: favoritedMovies.length + receivedFavorites
            }
        });
        
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

function extractYouTubeId(url) {
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

async function startServer() {
    await connectToMongoDB();
    
    app.listen(PORT, () => {
        console.log(`🚀 Servidor rodando na porta ${PORT}`);
        console.log(`📊 MongoDB: ${MONGODB_URI}`);
        console.log('\n🌐 Endpoints disponíveis:');
        console.log('  GET  http://localhost:3000/api/status');
        console.log('  POST http://localhost:3000/api/register');
        console.log('  POST http://localhost:3000/api/login');
        console.log('  GET  http://localhost:3000/api/movies?userId=ID');
        console.log('  POST http://localhost:3000/api/movies/:id/toggle-favorite');
        console.log('  GET  http://localhost:3000/api/movies/public');
        console.log('  GET  http://localhost:3000/api/user/:id/stats');
        console.log('\n🎬 Funcionalidades:');
        console.log('  ✅ Sistema de trailer do YouTube');
        console.log('  ✅ Filmes públicos/compartilhados');
        console.log('  ✅ Favoritar filmes de outros usuários');
        console.log('  ✅ Contador de favoritos por filme');
        console.log('  ✅ Estatísticas de interação entre usuários');
        console.log('\n✅ Pronto para usar!');
    });
}

process.on('SIGINT', async () => {
    console.log('🛑 Desconectando do MongoDB...');
    await client.close();
    process.exit(0);
});

startServer();