const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'crm', 'panels', 'DirectorioClientes.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add imports after CSS import
content = content.replace("import './Directorio.css';", "import './Directorio.css';\nimport RegistrarClienteModal from '../components/RegistrarClienteModal';\nimport FichaClienteModal from './FichaClienteModal';");

// 2. Remove all states except the ones we need.
// We need to keep:
// - custSearchTerm
// - showAddCustomerModal
// - selectedCustomer
// - localFiltered
// And the `useDirectorio` hook.

// Delete: New Customer fields
content = content.replace(/\/\/ New Customer fields[\s\S]*?(?=const \[selectedSaeClave, setSelectedSaeClave\] = useState\(null\);)/, '');
content = content.replace(/const \[selectedSaeClave, setSelectedSaeClave\] = useState\(null\);\n/, '');

// Delete: companySearchSuggestions and showCompanySuggestions
content = content.replace(/const \[companySearchSuggestions[\s\S]*?setShowCompanySuggestions\(false\);\n/, '');

// Replace: Selected Customer detail modal states & Edit Customer fields & Evidence photo states
content = content.replace(/\/\/ Selected Customer detail modal states[\s\S]*?\/\/ Filter application for Customers locally/m, 
`// Selected Customer detail modal states
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Filter application for Customers locally`);

// Delete everything from the end of parseCustomerNotes to the return statement.
// Wait, `handleOpenCustomerDetails` is needed!
// Let's replace the huge chunk of functions with just `handleOpenCustomerDetails`.
const regexFunctions = /\/\/ Open customer details modal[\s\S]*?(?=return \(\n    <section className="crm-table-container glass">)/;
const newFunctions = `  // Open customer details modal
  const handleOpenCustomerDetails = (cust) => {
    if (onViewCustomerDetails) {
      onViewCustomerDetails(cust);
      return;
    }
    setSelectedCustomer(cust);
    fetchCustomerDetails(cust.id, cust.id);
  };

  `;
content = content.replace(regexFunctions, newFunctions);

// Finally, replace the huge `{showAddCustomerModal && ...` block with the new components.
const regexModals = /\{\/\* Add Customer Modal \*\/\}[\s\S]*?(?=<\/section>)/;
const newModals = `{/* Add Customer Modal */}
      {showAddCustomerModal && (
        <RegistrarClienteModal
          onClose={() => setShowAddCustomerModal(false)}
          onSuccess={() => { setShowAddCustomerModal(false); fetchCustomers(); }}
          API_BASE={API_BASE}
          allCompanies={allCompanies}
        />
      )}

      {/* Customer Details & History Modal */}
      {selectedCustomer && (
        <FichaClienteModal
          selectedCustomer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          role={role}
          API_BASE={API_BASE}
          fetchCustomers={fetchCustomers}
          handleLoadPastQuote={handleLoadPastQuote}
        />
      )}
    `;
content = content.replace(regexModals, newModals);

fs.writeFileSync(filePath, content);
console.log('DirectorioClientes.jsx string replace refactored successfully.');
