
import fs from 'fs';
const dirCard = 'src/features/directory/components/DirectoryCard.jsx';
let dContent = fs.readFileSync(dirCard, 'utf8');
dContent = dContent.replace(/const isSae = String\\(data\\.id\\)\\.startsWith\\('sae-'\\);/g, 'const isSae = false;');
fs.writeFileSync(dirCard, dContent);

const fichaModal = 'src/features/directory/components/FichaClienteIndividualModal.jsx';
let fContent = fs.readFileSync(fichaModal, 'utf8');
fContent = fContent.replace(/const isSae = customerId\\?\\.startsWith\\('sae-'\\);/g, 'const isSae = false;');
fContent = fContent.replace(/const isSaeClient = String\\(customerId\\)\\.startsWith\\('sae-'\\);/g, 'const isSaeClient = false;');
fContent = fContent.replace(/const targetCompanyId = isSaeClient \\? customerId : selectedCustomer\\.company_id;/g, 'const targetCompanyId = selectedCustomer.company_id;');
fContent = fContent.replace(/const cleanId = isSae \\? id : id;/g, 'const cleanId = id;');
fContent = fContent.replace(/const isSae = String\\(leadId\\)\\.startsWith\\('sae-'\\);/g, 'const isSae = false;');
fContent = fContent.replace(/const targetCompanyId = isSae \\? leadId : currentCustomer\\?\\.company_id;/g, 'const targetCompanyId = currentCustomer?.company_id;');
fContent = fContent.replace(/const updateUrl = isSae/g, 'const updateUrl = false'); // this will break the ternary? Wait, if I replace const updateUrl = isSae \n ? ... : ...
// Let's just view FichaClienteIndividualModal.jsx first to do it properly.

