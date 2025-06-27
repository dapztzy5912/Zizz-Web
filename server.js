const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync('uploads')) {
            fs.mkdirSync('uploads');
        }
        cb(null, 'uploads');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

let db = { products: [] };

const loadDatabase = () => {
    try {
        const data = fs.readFileSync('database.json', 'utf8');
        db = JSON.parse(data);
    } catch (err) {
        console.log('No database file found, starting with empty database');
        saveDatabase();
    }
};

const saveDatabase = () => {
    fs.writeFileSync('database.json', JSON.stringify(db, null, 2));
};

loadDatabase();

app.get('/api/products', (req, res) => {
    res.json(db.products);
});

app.get('/api/products/:id', (req, res) => {
    const product = db.products.find(p => p.id == req.params.id);
    if (product) {
        res.json(product);
    } else {
        res.status(404).json({ error: 'Product not found' });
    }
});

app.post('/api/products', upload.array('images', 10), (req, res) => {
    const { name, price, description } = req.body;
    const images = req.files ? req.files.map(file => file.filename) : [];
    
    const newProduct = {
        id: Date.now().toString(),
        name,
        price: parseFloat(price),
        description,
        images
    };
    
    db.products.push(newProduct);
    saveDatabase();
    
    res.status(201).json(newProduct);
});

app.post('/api/products/:id', upload.array('images', 10), (req, res) => {
    const { name, price, description } = req.body;
    const productId = req.params.id;
    const productIndex = db.products.findIndex(p => p.id == productId);
    
    if (productIndex === -1) {
        return res.status(404).json({ error: 'Product not found' });
    }
    
    let images = [...db.products[productIndex].images];
    
    if (req.files && req.files.length > 0) {
        images = [...images, ...req.files.map(file => file.filename)];
    }
    
    const updatedProduct = {
        ...db.products[productIndex],
        name,
        price: parseFloat(price),
        description,
        images
    };
    
    db.products[productIndex] = updatedProduct;
    saveDatabase();
    
    res.json(updatedProduct);
});

app.delete('/api/products/:id', (req, res) => {
    const productId = req.params.id;
    const productIndex = db.products.findIndex(p => p.id == productId);
    
    if (productIndex === -1) {
        return res.status(404).json({ error: 'Product not found' });
    }
    
    db.products.splice(productIndex, 1);
    saveDatabase();
    
    res.json({ message: 'Product deleted successfully' });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
