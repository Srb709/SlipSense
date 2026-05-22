export type LeadTag =
  | 'Absentee Owner'
  | 'Long-Term Owner'
  | 'Out-of-Philly Owner'
  | 'Recent Transfer'
  | 'Sheriff/Distress Signal'
  | 'Lower Assessed Value';

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
  propertyType?: string;
  minValue?: number;
  maxValue?: number;
  minYearsOwned?: number;
  leadType?: 'all' | 'absentee' | 'longTerm' | 'distressed' | 'investor';
};
