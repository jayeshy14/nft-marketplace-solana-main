use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{mint_to, Mint, MintTo, Token, TokenAccount},
};
use borsh::{BorshDeserialize, BorshSerialize};

declare_id!("8VUfy12GD5yhKAcb7zdkAmjGyiMZVq5ce2zMNyi31Bra");

#[program]
pub mod solana_nft_anchor {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let state = &mut ctx.accounts.state;

        state.counter = 0;
        state.metadata_uri = Vec::new();
        state.owners = Vec::new();
        state.nft_states = Vec::new();

        Ok(())
    }

    pub fn init_nft(ctx: Context<InitNFT>, _metadata_uri: String) -> Result<()> {
        let state = &mut ctx.accounts.state;
        // let token_id = state.counter;

        // create mint account
        let cpi_context = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.associated_token_account.to_account_info(),
                authority: ctx.accounts.signer.to_account_info(),
            },
        );

        mint_to(cpi_context, 1)?;

        // update state
        state.counter += 1;
        state.metadata_uri.push(_metadata_uri.into_bytes());
        state.owners.push(ctx.accounts.signer.key().to_bytes());
        state.nft_states.push(0); // this represents 'Minted'

        Ok(())
    }

    pub fn get_owners(ctx: Context<GetCounter>) -> Result<Vec<[u8; 32]>> {
        let state = &ctx.accounts.state;
        Ok(state.owners.clone())
    }

    pub fn get_nft_states(ctx: Context<GetCounter>) -> Result<Vec<u8>> {
        let state = &ctx.accounts.state;
        Ok(state.nft_states.clone())
    }

    pub fn get_metadatauri(ctx: Context<GetCounter>) -> Result<Vec<Vec<u8>>> {
        let state = &ctx.accounts.state;
        Ok(state.metadata_uri.clone())
    }

    pub fn get_nft_pending_owners(ctx: Context<GetCounter>) -> Result<Vec<[u8; 32]>> {
        let state = &ctx.accounts.state;
        // Return pending owners list
        Ok(vec![]) // Adjust based on your logic
    }

    pub fn get_counter(ctx: Context<GetCounter>) -> Result<u32> {
        let state = &ctx.accounts.state;
        Ok(state.counter)
    }
}

#[account]
/*
1. metadata URI: Vec<Vec<u8>>
Suppose we have 3 NFTs with the following metadata URIs:
-> "https://example.com/nft1"
-> "https://example.com/nft2"
-> "https://example.com/nft3"
These would be stored in 'metadata_uri' like this:
```
metadata_uri = [    
    vec![104, 116, 116, 112, 115, 58, 47, 47, 101, 120, 97, 109, 112, 108, 101, 46, 99, 111, 109, 47, 110, 102, 116, 49],
    vec![104, 116, 116, 112, 115, 58, 47, 47, 101, 120, 97, 109, 112, 108, 101, 46, 99, 111, 109, 47, 110, 102, 116, 50],
    vec![104, 116, 116, 112, 115, 58, 47, 47, 101, 120, 97, 109, 112, 108, 101, 46, 99, 111, 109, 47, 110, 102, 116, 51]
]
```

2. owners: Vec<[u8; 32]>
Suppose we have 3 NFTs with the following public keys:
-> 'Pubkey1' represented as '[1, 2, 3, ..., 32]'
-> 'Pubkey2' represented as '[33, 34, 35, ..., 64]'
-> 'Pubkey3' represented as '[65, 66, 67, ..., 96]'
These would be stored in 'owners' like this:
```
owners = [
    [1, 2, 3, ..., 32],
    [33, 34, 35, ..., 64],
    [65, 66, 67, ..., 96]
]
```

3. nft_states: Vec<u8>
Suppose we have 3 NFTs with the following states:
-> 0(Minted)
-> 1(Bought)
-> 0(Minted)
These would be stored in 'nft_states' like this:
```
nft_states = [
    0,
    1,
    0
]
```
*/
pub struct State {
    pub counter: u32,
    pub metadata_uri: Vec<Vec<u8>>,
    pub owners: Vec<[u8; 32]>,
    pub nft_states: Vec<u8>,
}

impl State {
    pub const LEN: usize = 8 + 
        4 + // counter
        4 + // length of metadata_uri
        4 + // length of owners
        4 + // length of nft_states
        32 * 100 + // Assume a maximum of 1000 metadata URIs
        32 * 100 + // Assume a maximum of 1000 owners
        1 * 100 // Assume a maximum of 1000 NFT states
    ;
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init, 
        payer = signer, 
        space = State::LEN,
        seeds = [b"state"],
        bump)]
    pub state: Account<'info, State>,
    /// CHECK: ok, we are passing in this account ourselves
    #[account(mut, signer)]
    pub signer: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitNFT<'info> {
    #[account(mut)]
    pub state: Account<'info, State>,
    /// CHECK: ok, we are passing in this account ourselves
    #[account(mut, signer)]
    pub signer: AccountInfo<'info>,
    #[account(
        init,
        payer = signer,
        mint::decimals = 0,
        mint::authority = signer.key(),
        mint::freeze_authority = signer.key(),
        seeds = [b"mint", signer.key().as_ref(), state.counter.to_le_bytes().as_ref()],
        bump,
    )]
    pub mint: Account<'info, Mint>,
    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = mint,
        associated_token::authority = signer,
    )]
    pub associated_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct GetCounter<'info> {
    pub state: Account<'info, State>,
}
