# 🎬 CineDB

Sistema web para **gerenciamento de filmes pessoais**, desenvolvido como trabalho da disciplina **Banco de Dados II**.

A aplicação permite que usuários se cadastrem, adicionem filmes à sua coleção, compartilhem filmes publicamente e interajam com filmes de outros usuários através do sistema de favoritos.

O projeto utiliza **Node.js + Express no backend**, **MongoDB como banco de dados NoSQL** e **HTML, CSS e JavaScript no frontend**.

---

# 📌 Funcionalidades

* 👤 Cadastro de usuários
* 🔐 Login de usuários
* 🎬 Cadastro de filmes
* ✏️ Edição de filmes
* ❌ Exclusão de filmes
* 🌍 Compartilhamento de filmes públicos
* ⭐ Sistema de favoritos entre usuários
* 📊 Estatísticas de interação
* 🔎 Busca de filmes por título
* ▶️ Suporte para trailers do YouTube

---

# 🛠️ Tecnologias Utilizadas

### Backend

* Node.js
* Express
* MongoDB
* bcryptjs
* cors

### Frontend

* HTML5
* CSS3
* JavaScript (Vanilla)

### Banco de Dados

* MongoDB (NoSQL)

---

# 📂 Estrutura do Projeto

```
CINEDB
│
├── backend
│   ├── node_modules
│   ├── package.json
│   ├── package-lock.json
│   └── server.js
│
├── frontend
│   ├── index.html
│   ├── script.js
│   └── style.css
│
├── .gitattributes
├── .gitignore
├── LICENSE
└── README.md
```

### Descrição das Pastas

**backend/**

* Contém a API desenvolvida com **Node.js + Express**
* Responsável por comunicação com o **MongoDB**

**frontend/**

* Interface da aplicação
* Responsável pela interação com o usuário e consumo da API

---

# ⚙️ Pré-requisitos

Antes de rodar o projeto, é necessário ter instalado:

* Node.js
* MongoDB
* npm

---

# 🚀 Como Executar o Projeto

## 1️⃣ Iniciar o MongoDB

Certifique-se de que o MongoDB esteja rodando:

```
mongod
```

---

## 2️⃣ Rodar o Backend

Entre na pasta **backend**:

```
cd backend
```

Instale as dependências:

```
npm install
```

Inicie o servidor:

```
node server.js
```

O servidor irá rodar em:

```
http://localhost:3000
```

---

## 3️⃣ Abrir o Frontend

Abra o arquivo:

```
frontend/index.html
```

no navegador.

---

# 🗄️ Estrutura do Banco de Dados

## Coleção: users

```
{
  _id,
  name,
  email,
  password,
  createdAt
}
```

---

## Coleção: movies

```
{
  _id,
  title,
  description,
  trailer,
  trailerId,
  userId,
  isPublic,
  favoritedBy[],
  createdAt,
  updatedAt
}
```

---

# 📊 Objetivo Acadêmico

Este projeto foi desenvolvido como atividade prática da disciplina **Banco de Dados II**, com o objetivo de aplicar conceitos de:

* Modelagem de dados NoSQL
* CRUD com MongoDB
* Integração entre **API e banco de dados**
* Estruturação de aplicações **Full Stack**

---

# 👥 Equipe

Projeto desenvolvido por:

* Johnny Xavier
* Juliano Matheus
* Luciano Hugo
* Nathalya Christinne
* Raíssa Martins

Disciplina: **Banco de Dados II**
Curso: **Engenharia de Software**

**ICET - UFAM**
