import React from 'react';
import ContactCard from '../../cards/ContactCard/ContactCard';
import CompanyCard from '../../cards/CompanyCard/CompanyCard';

export default function DirectoryCard({
  type,
  data,
  onViewDetails,
  onUnlinkCompany,
  onViewCompanyDetails,
  creatorName,
  priceLists = []
}) {
  if (type === 'contact') {
    return (
      <ContactCard
        contact={data}
        onViewDetails={onViewDetails}
        onUnlinkCompany={onUnlinkCompany}
        onViewCompanyDetails={onViewCompanyDetails}
        creatorName={creatorName}
        priceLists={priceLists}
      />
    );
  }

  return (
    <CompanyCard
      company={data}
      onViewDetails={onViewDetails}
    />
  );
}
