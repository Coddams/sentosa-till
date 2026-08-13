export const SERVICES = [
  { id: 1,  name: 'B&W Printing',        price: 200,  gen: true,  unit: 'page',  category: 'Printing' },
  { id: 2,  name: 'Colour Printing',      price: 300,  gen: true,  unit: 'page',  category: 'Printing' },
  { id: 3,  name: 'Conqueror Printing',   price: 500,  gen: true,  unit: 'page',  category: 'Printing' },
  { id: 4,  name: 'Photocopy',            price: 100,  gen: true,  unit: 'page',  category: 'Photocopy' },
  { id: 5,  name: 'Scanning',             price: 100,  gen: true,  unit: 'page',  category: 'Scanning' },
  { id: 6,  name: 'Typing',               price: 500,  gen: false, unit: 'job',   category: 'Typing' },
  { id: 7,  name: 'Binding',              price: 500,  gen: false, unit: 'doc',   category: 'Stationery' },
  { id: 8,  name: 'Envelope',             price: 200,  gen: false, unit: 'each',  category: 'Stationery' },
  { id: 9,  name: 'Photo Editing',        price: 500,  gen: false, unit: 'image', category: 'Editing' },
  { id: 0,  name: 'Doc Editing',          price: 200,  gen: false, unit: 'page',  category: 'Editing' },
  { id: 'q', name: 'Online Application', price: 2500, gen: false, unit: 'job',   category: 'Digital' },
  { id: 'w', name: 'Remita Payment',     price: 2000, gen: false, unit: 'job',   category: 'Digital' },
  { id: 'e', name: 'Bill Payment',       price: 500,  gen: false, unit: 'job',   category: 'Digital' },
  { id: 'r', name: 'CV Basic',           price: 700,  gen: false, unit: 'job',   category: 'CV' },
  { id: 't', name: 'CV Professional',    price: 1500, gen: false, unit: 'job',   category: 'CV' },
  { id: 'a', name: 'Colour Photocopy', price: 200, gen: true, unit: 'page', category: 'Photocopy' },
  { id: 'y', name: 'Other',              price: 0,    gen: false, unit: '',      category: 'Other' },
]

export const GEN_SURCHARGE = 100 // ₦100 per page/use

export const KEY_MAP = {}
SERVICES.forEach(s => { KEY_MAP[String(s.id)] = s })

export const fmt = (n) =>
  '₦' + Number(n).toLocaleString('en-NG', { minimumFractionDigits: 0 })
