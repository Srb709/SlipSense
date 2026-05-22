export type PropertyRecord = {
  id: string;
  address: string;
  neighborhood: string;
  zipCode: string;
  propertyType: string;
  ownerName: string;
  mailingAddress: string;
  marketValue: number;
  saleDate?: string;
  yearsOwned: number;
  absenteeOwner: boolean;
  distressedFlag: boolean;
  leadScore: number;
};

export type Filters = {
  neighborhood?: string;
  zipCode?: string;
  propertyType?: string;
  minValue?: number;
  maxValue?: number;
  minYearsOwned?: number;
};
