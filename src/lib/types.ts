export type LeadTag =
  | 'Absentee Owner'
  | 'Long-Term Owner'
  | '20+ Year Owner'
  | 'Out-of-Philly Owner'
  | 'Good Value Range'
  | 'Very Low Value';

export type PropertyRecord = {
  id: string;
  address: string;
  neighborhood: string;
  zipCode: string;
  propertyType: string;
  ownerName: string;
  mailingAddress: string;
  mailingCityState: string;
  marketValue: number;
  saleDate?: string;
  yearsOwned: number;
  absenteeOwner: boolean;
  outOfPhillyOwner: boolean;
  distressedFlag: boolean;
  recentTransfer: boolean;
  sheriffSignal: boolean;
  delinquencySignal: boolean;
  latestTransferDate?: string;
  latestDocumentType?: string;
  leadScore: number;
  tags: LeadTag[];
};

export type Filters = {
  neighborhood?: string;
  zipCode?: string;
  propertyType?: string;
  includeVacantLand?: boolean;
  minValue?: number;
  maxValue?: number;
  minYearsOwned?: number;
  leadType?: 'all' | 'absentee' | 'longTerm' | 'distressed' | 'investor';
};
