import React from 'react';
import './FichaSubModals.css';
import B2BContactManager from '../../ficha-contacto/B2BContactManager';
import FichaContactoModal from '../../ficha-contacto/FichaContactoModal';
import FichaEmpresaModal from '../../ficha-empresa/FichaEmpresaModal';
import RegistrarVisitaModal from '../../visita/RegistrarVisitaModal';
import CrearProspectoModal from '../../../ventas/crear-prospecto/CrearProspectoModal';

import SubModalEditContacto from '../SubModalEditContacto/SubModalEditContacto';
import SubModalEditEmpresa from '../SubModalEditEmpresa/SubModalEditEmpresa';
import SubModalVincularObra from '../SubModalVincularObra/SubModalVincularObra';
import SubModalDescartarCliente from '../SubModalDescartarCliente/SubModalDescartarCliente';

export default function FichaSubModals({ crm, API_BASE, fetchCustomers }) {
  const token = localStorage.getItem('token');

  return (
    <>
      {crm.showVisitaModal && (
        <RegistrarVisitaModal
          isOpen={crm.showVisitaModal}
          onClose={() => crm.setShowVisitaModal(false)}
          onSubmitSuccess={() => {
            crm.setShowVisitaModal(false);
            crm.fetchVisitas(crm.customerId);
            if (fetchCustomers) fetchCustomers();
          }}
          API_BASE={API_BASE}
          companyId={crm.currentCustomer.company_id || null}
          contactId={crm.customerId}
          companyName={crm.currentCustomer.company || ''}
          contactName={crm.currentCustomer.name || ''}
        />
      )}

      {crm.showVentaModal && (
        <CrearProspectoModal
          isOpen={crm.showVentaModal}
          onClose={() => crm.setShowVentaModal(false)}
          onSuccess={() => {
            crm.setShowVentaModal(false);
            crm.fetchOpportunities(crm.customerId);
            crm.reloadCustomerDetails();
            if (fetchCustomers) fetchCustomers();
          }}
          API_BASE={API_BASE}
          customer={crm.currentCustomer}
        />
      )}

      {crm.showB2BContactManager && (
        <B2BContactManager
          onClose={() => crm.setShowB2BContactManager(false)}
          companyContacts={crm.companyContacts}
          currentCustomer={crm.currentCustomer}
          token={token}
          API_BASE={API_BASE}
          onSaved={() => {
            crm.setShowB2BContactManager(false);
            if (fetchCustomers) fetchCustomers();
            if (crm.currentCustomer?.company_id) crm.fetchCompanyContacts(crm.currentCustomer.company_id);
            if (crm.isSae) crm.fetchCompanyContacts(crm.customerId);
          }}
        />
      )}

      {crm.editingCompanyContact && (
        <FichaContactoModal
          contact={crm.editingCompanyContact.contact || crm.editingCompanyContact}
          onViewCompanyDetails={(company) => {
            if (company.id === crm.currentCustomer.company_id || company.name === crm.currentCustomer.company) {
              crm.setEditingCompanyContact(null);
            } else {
              crm.setEditingCompanyContact(null);
              crm.setViewingCompany(company);
            }
          }}
          onClose={() => crm.setEditingCompanyContact(null)}
          refetch={() => {
            if (crm.currentCustomer?.company_id) crm.fetchCompanyContacts(crm.currentCustomer.company_id);
            if (crm.isSae) crm.fetchCompanyContacts(crm.customerId);
          }}
        />
      )}

      {crm.viewingCompany && (
        <FichaEmpresaModal
          company={crm.viewingCompany}
          onClose={() => crm.setViewingCompany(null)}
          onViewCustomerDetails={(contact) => {
            crm.setViewingCompany(null);
            crm.setEditingCompanyContact(contact);
          }}
          API_BASE={API_BASE}
        />
      )}

      {crm.showEditContactModal && (
        <SubModalEditContacto
          setShowEditContactModal={crm.setShowEditContactModal}
          contactNameInput={crm.contactNameInput}
          setContactNameInput={crm.setContactNameInput}
          contactPositionInput={crm.contactPositionInput}
          setContactPositionInput={crm.setContactPositionInput}
          contactEmailInput={crm.contactEmailInput}
          setContactEmailInput={crm.setContactEmailInput}
          contactPhoneInput={crm.contactPhoneInput}
          setContactPhoneInput={crm.setContactPhoneInput}
          contactPhoneAltInput={crm.contactPhoneAltInput}
          setContactPhoneAltInput={crm.setContactPhoneAltInput}
          contactWhatsappInput={crm.contactWhatsappInput}
          setContactWhatsappInput={crm.setContactWhatsappInput}
          contactNotesInput={crm.contactNotesInput}
          setContactNotesInput={crm.setContactNotesInput}
          handleUpdateContact={crm.handleUpdateContact}
          isSavingContact={crm.isSavingContact}
        />
      )}

      {crm.showEditCompanyModal && (
        <SubModalEditEmpresa
          setShowEditCompanyModal={crm.setShowEditCompanyModal}
          selectedCompanyId={crm.selectedCompanyId}
          setSelectedCompanyId={crm.setSelectedCompanyId}
          currentCustomer={crm.currentCustomer}
          companyNameInput={crm.companyNameInput}
          setCompanyNameInput={crm.setCompanyNameInput}
          isLoadingCompanySuggestions={crm.isLoadingCompanySuggestions}
          showCompanySuggestions={crm.showCompanySuggestions}
          companySuggestions={crm.companySuggestions}
          handleSelectCompanySuggestion={crm.handleSelectCompanySuggestion}
          companyRfcInput={crm.companyRfcInput}
          setCompanyRfcInput={crm.setCompanyRfcInput}
          companyAddressInput={crm.companyAddressInput}
          setCompanyAddressInput={crm.setCompanyAddressInput}
          companyCityInput={crm.companyCityInput}
          setCompanyCityInput={crm.setCompanyCityInput}
          companyStateInput={crm.companyStateInput}
          setCompanyStateInput={crm.setCompanyStateInput}
          handleUpdateCompany={crm.handleUpdateCompany}
          isSavingCompany={crm.isSavingCompany}
        />
      )}

      {crm.showEditObraModal && (
        <SubModalVincularObra
          setShowEditObraModal={crm.setShowEditObraModal}
          obraSearchInput={crm.obraSearchInput}
          setObraSearchInput={crm.setObraSearchInput}
          selectedObraId={crm.selectedObraId}
          setSelectedObraId={crm.setSelectedObraId}
          isLoadingObraSuggestions={crm.isLoadingObraSuggestions}
          showObraSuggestions={crm.showObraSuggestions}
          obraSuggestions={crm.obraSuggestions}
          handleSelectObraSuggestion={crm.handleSelectObraSuggestion}
          obraAddressInput={crm.obraAddressInput}
          setObraAddressInput={crm.setObraAddressInput}
          obraStatusInput={crm.obraStatusInput}
          setObraStatusInput={crm.setObraStatusInput}
          handleSaveObra={crm.handleSaveObra}
          isSavingObra={crm.isSavingObra}
        />
      )}

      {crm.showDiscardModal && (
        <SubModalDescartarCliente
          isDiscarding={crm.isDiscarding}
          setShowDiscardModal={crm.setShowDiscardModal}
          setDiscardError={crm.setDiscardError}
          currentCustomer={crm.currentCustomer}
          discardReason={crm.discardReason}
          setDiscardReason={crm.setDiscardReason}
          discardError={crm.discardError}
          confirmArchiveCustomer={crm.confirmArchiveCustomer}
        />
      )}
    </>
  );
}
