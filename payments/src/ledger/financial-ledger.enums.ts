export enum FinancialLedgerComponent {
  GROSS = 'GROSS',
  PROVIDER_FEE = 'PROVIDER_FEE',
  PLATFORM_FEE = 'PLATFORM_FEE',
  CLUB_NET = 'CLUB_NET',
  SELLER_NET = 'SELLER_NET',
  REFUND = 'REFUND',
  SETTLEMENT = 'SETTLEMENT',
}

export enum PaymentAllocationComponent {
  PLATFORM_FEE = 'PLATFORM_FEE',
  CLUB_NET = 'CLUB_NET',
  SELLER_NET = 'SELLER_NET',
}

export enum FinancialBeneficiaryType {
  UNALLOCATED = 'UNALLOCATED',
  PROVIDER = 'PROVIDER',
  PLATFORM = 'PLATFORM',
  CLUB = 'CLUB',
  SELLER = 'SELLER',
  CUSTOMER = 'CUSTOMER',
}
