
import fs from 'fs';
const dirCard = 'src/features/directory/components/DirectoryCard.jsx';
let dContent = fs.readFileSync(dirCard, 'utf8');
dContent = dContent.replace(/const isSae = String\\(data\\.id\\)\\.startsWith\\('sae-'\\);/g, 'const isSae = false;');
fs.writeFileSync(dirCard, dContent);

const modal = 'src/features/directory/components/FichaClienteIndividualModal.jsx';
let fContent = fs.readFileSync(modal, 'utf8');
fContent = fContent.replace(/const isSae = customerId\\?\\.startsWith\\('sae-'\\);/g, 'const isSae = false;');
fContent = fContent.replace(/const isSaeClient = String\\(customerId\\)\\.startsWith\\('sae-'\\);/g, 'const isSaeClient = false;');
fContent = fContent.replace(/const targetCompanyId = isSaeClient \\? customerId : selectedCustomer\\.company_id;/g, 'const targetCompanyId = selectedCustomer.company_id;');
fContent = fContent.replace(/const cleanId = isSae \\? id : id;/g, 'const cleanId = id;');
fContent = fContent.replace(/const isSae = String\\(leadId\\)\\.startsWith\\('sae-'\\);/g, 'const isSae = false;');
fContent = fContent.replace(/const targetCompanyId = isSae \\? leadId : currentCustomer\\?\\.company_id;/g, 'const targetCompanyId = currentCustomer?.company_id;');
fContent = fContent.replace(/const updateUrl = isSae[\\s\\S]*?\\? \\\\/api/crm/customers/sae/\\\\\\[\\s\\S]*?: \\\\/api/crm/customers/\\\\\\;/g, 'const updateUrl = /api/crm/customers/;');
fs.writeFileSync(modal, fContent);

