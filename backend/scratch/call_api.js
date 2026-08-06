import jwt from 'jsonwebtoken';

const JWT_SECRET = 'garza_crm_secret_2026';

const token = jwt.sign(
  {
    userId: '0fa243df-7307-4454-9f55-a3a625c62184',
    role: 'sales',
    companyId: 'fbfe03d0-befe-461e-859c-032015550d64',
    name: 'USUARIO MUESTRA'
  },
  JWT_SECRET,
  { expiresIn: '1h' }
);

async function call() {
  try {
    const res = await fetch('http://localhost:5000/api/crm/opportunities', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await res.json();
    console.log('API Response:', data);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

call();
