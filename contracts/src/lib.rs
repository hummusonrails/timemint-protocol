#![cfg_attr(not(any(feature = "export-abi", test)), no_main)]
extern crate alloc;

use alloc::{string::String, vec, vec::Vec};
use alloc::string::ToString;
use alloc::format;
use alloy_primitives::{Address, U256, FixedBytes};
use stylus_sdk::{abi::Bytes, prelude::*};
use alloy_sol_types::sol;
use core::marker::PhantomData;

// ERC-721 Params Trait
pub trait Erc721Params {
    const NAME: &'static str;
    const SYMBOL: &'static str;
    fn token_uri(token_id: U256) -> String;
}

// Booking Params
pub struct BookingParams;
impl Erc721Params for BookingParams {
    const NAME: &'static str = "TimeMint Slot";
    const SYMBOL: &'static str = "TMSLOT";
    fn token_uri(token_id: U256) -> String {
        let mut s = "https://timemint.xyz/api/slot/".to_string();
        s.push_str(&token_id.to_string());
        s.push_str(".json");
        s
    }
}

// ERC-721 Storage & Logic
sol_storage! {
    pub struct Erc721<T: Erc721Params> {
        mapping(uint256 => address) owners;
        mapping(address => uint256) balances;
        mapping(uint256 => address) token_approvals;
        mapping(address => mapping(address => bool)) operator_approvals;
        uint256 total_supply;
        PhantomData<T> phantom;
    }
}

sol! {
    #[derive(Debug)]
    error InvalidTokenId(uint256 token_id);
    #[derive(Debug)]
    error NotOwner(address from, uint256 token_id, address real_owner);
    #[derive(Debug)]
    error NotApproved(address owner, address spender, uint256 token_id);
    #[derive(Debug)]
    error TransferToZero(uint256 token_id);
    #[derive(Debug)]
    error ReceiverRefused(address receiver, uint256 token_id, bytes4 returned);
    event Transfer(address indexed from, address indexed to, uint256 indexed token_id);
    event Approval(address indexed owner, address indexed approved, uint256 indexed token_id);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    // Removed unused errors to reduce WASM size
}

#[derive(SolidityError, Debug)]
pub enum Erc721Error {
    InvalidTokenId(self::InvalidTokenId),
    NotOwner(self::NotOwner),
    NotApproved(self::NotApproved),
    TransferToZero(self::TransferToZero),
    ReceiverRefused(self::ReceiverRefused),
}

sol_interface! {
    interface IERC721TokenReceiver {
        function onERC721Received(address operator, address from, uint256 token_id, bytes data) external returns(bytes4);
    }
}

const ERC721_TOKEN_RECEIVER_ID: u32 = 0x150b7a02;

impl<T: Erc721Params> Erc721<T> {
    fn require_authorized_to_spend(&self, from: Address, token_id: U256) -> Result<(), Erc721Error> {
        let owner = self.owner_of(token_id)?;
        if from != owner {
            return Err(Erc721Error::NotOwner(self::NotOwner { from, token_id, real_owner: owner }));
        }
        if self.vm().msg_sender() == owner {
            return Ok(());
        }
        if self.operator_approvals.getter(owner).get(self.vm().msg_sender()) {
            return Ok(());
        }
        if self.vm().msg_sender() == self.token_approvals.get(token_id) {
            return Ok(());
        }
        Err(Erc721Error::NotApproved(self::NotApproved { owner, spender: self.vm().msg_sender(), token_id }))
    }
    pub fn transfer(&mut self, token_id: U256, from: Address, to: Address) -> Result<(), Erc721Error> {
        let mut owner = self.owners.setter(token_id);
        let previous_owner = owner.get();
        if previous_owner != from {
            return Err(Erc721Error::NotOwner(self::NotOwner { from, token_id, real_owner: previous_owner }));
        }
        owner.set(to);
        // Fix borrow checker: retrieve values before mutably borrowing
        {
            let from_balance_val = self.balances.get(from);
            self.balances.setter(from).set(from_balance_val - U256::from(1));
        }
        {
            let to_balance_val = self.balances.get(to);
            self.balances.setter(to).set(to_balance_val + U256::from(1));
        }
        self.token_approvals.setter(token_id).set(Address::ZERO);
        log(self.vm(), Transfer { from, to, token_id });
        Ok(())
    }
    fn call_receiver<S: TopLevelStorage + HostAccess>(storage: &mut S, token_id: U256, from: Address, to: Address, data: Vec<u8>) -> Result<(), Erc721Error> {
        // Store vm() in a variable before mutable borrow
        let vm = storage.vm();
        if vm.code(to).len() > 0 {
            let receiver = IERC721TokenReceiver::new(to);
            let sender = vm.msg_sender();
            let received = receiver
                .on_erc_721_received(&mut *storage, sender, from, token_id, data.into())
                .map_err(|_e| Erc721Error::ReceiverRefused(self::ReceiverRefused { receiver: to, token_id, returned: FixedBytes::<4>::from([0u8; 4]) }))?
                .0;
            if u32::from_be_bytes(received) != ERC721_TOKEN_RECEIVER_ID {
                return Err(Erc721Error::ReceiverRefused(self::ReceiverRefused { receiver: to, token_id, returned: FixedBytes::<4>::from(received) }));
            }
        }
        Ok(())
    }
    pub fn safe_transfer<S: TopLevelStorage + HostAccess + core::borrow::BorrowMut<Self>>(storage: &mut S, token_id: U256, from: Address, to: Address, data: Vec<u8>) -> Result<(), Erc721Error> {
        storage.borrow_mut().transfer(token_id, from, to)?;
        Self::call_receiver(storage, token_id, from, to, data)
    }
    pub fn mint(&mut self, to: Address) -> Result<U256, Erc721Error> {
        let new_token_id = self.total_supply.get();
        self.total_supply.set(new_token_id + U256::from(1u8));
        self.transfer(new_token_id, Address::ZERO, to)?;
        Ok(new_token_id)
    }
    pub fn burn(&mut self, from: Address, token_id: U256) -> Result<(), Erc721Error> {
        self.transfer(token_id, from, Address::ZERO)?;
        Ok(())
    }
    pub fn name() -> Result<String, Erc721Error> {
        Ok(T::NAME.into())
    }
    pub fn symbol() -> Result<String, Erc721Error> {
        Ok(T::SYMBOL.into())
    }
    pub fn token_uri(&self, token_id: U256) -> Result<String, Erc721Error> {
        self.owner_of(token_id)?;
        Ok(T::token_uri(token_id))
    }
    pub fn balance_of(&self, owner: Address) -> Result<U256, Erc721Error> {
        Ok(self.balances.get(owner))
    }
    pub fn owner_of(&self, token_id: U256) -> Result<Address, Erc721Error> {
        let owner = self.owners.get(token_id);
        if owner.is_zero() {
            return Err(Erc721Error::InvalidTokenId(self::InvalidTokenId { token_id }));
        }
        Ok(owner)
    }
    pub fn safe_transfer_from_with_data<S: TopLevelStorage + HostAccess + core::borrow::BorrowMut<Self>>(
        storage: &mut S,
        from: Address,
        to: Address,
        token_id: U256,
        data: Bytes,
    ) -> Result<(), Erc721Error> {
        if to.is_zero() {
            return Err(Erc721Error::TransferToZero(self::TransferToZero { token_id }));
        }
        storage.borrow_mut().require_authorized_to_spend(from, token_id)?;
        Self::safe_transfer(storage, token_id, from, to, data.0)
    }
    pub fn safe_transfer_from<S: TopLevelStorage + HostAccess + core::borrow::BorrowMut<Self>>(
        storage: &mut S,
        from: Address,
        to: Address,
        token_id: U256,
    ) -> Result<(), Erc721Error> {
        Self::safe_transfer_from_with_data(storage, from, to, token_id, Bytes(vec![]))
    }
    pub fn transfer_from(&mut self, from: Address, to: Address, token_id: U256) -> Result<(), Erc721Error> {
        if to.is_zero() {
            return Err(Erc721Error::TransferToZero(self::TransferToZero { token_id }));
        }
        self.require_authorized_to_spend(from, token_id)?;
        self.transfer(token_id, from, to)?;
        Ok(())
    }
    pub fn approve(&mut self, approved: Address, token_id: U256) -> Result<(), Erc721Error> {
        let owner = self.owner_of(token_id)?;
        if self.vm().msg_sender() != owner && !self.operator_approvals.getter(owner).get(self.vm().msg_sender()) {
            return Err(Erc721Error::NotApproved(self::NotApproved { owner, spender: self.vm().msg_sender(), token_id }));
        }
        self.token_approvals.setter(token_id).set(approved);
        log(self.vm(), Approval { approved, owner, token_id });
        Ok(())
    }
    pub fn set_approval_for_all(&mut self, operator: Address, approved: bool) -> Result<(), Erc721Error> {
        let owner = self.vm().msg_sender();
        self.operator_approvals.setter(owner).setter(operator).set(approved);
        log(self.vm(), ApprovalForAll { owner, operator, approved });
        Ok(())
    }
    pub fn get_approved(&mut self, token_id: U256) -> Result<Address, Erc721Error> {
        Ok(self.token_approvals.get(token_id))
    }
    pub fn is_approved_for_all(&mut self, owner: Address, operator: Address) -> Result<bool, Erc721Error> {
        Ok(self.operator_approvals.getter(owner).get(operator))
    }
    pub fn supports_interface(interface: [u8; 4]) -> Result<bool, Erc721Error> {
        let interface_id = u32::from_be_bytes(interface);
        if interface_id == 0xffffffff {
            return Ok(false);
        }
        const IERC165: u32 = 0x01ffc9a7;
        const IERC721: u32 = 0x80ac58cd;
        const IERC721_METADATA: u32 = 0x5b5e139f;
        Ok(matches!(interface_id, IERC165 | IERC721 | IERC721_METADATA))
    }
}

// TimeMint Booking Contract
sol_storage! {
    #[entrypoint]
    pub struct TimeMint {
        #[borrow]
        Erc721<BookingParams> erc721;
        mapping(address => uint256) creator_count;
        mapping(address => mapping(uint256 => uint256)) creator_slots;
        mapping(address => uint256) owner_count;
        mapping(address => mapping(uint256 => uint256)) owner_slots;
        mapping(uint256 => address) creators;
        mapping(uint256 => uint256) slot_start;
        mapping(uint256 => uint256) slot_end;
        uint256 booking_fee;
        mapping(address => uint256) user_balances;
        mapping(bytes32 => address) site_creators;
        bytes32 admin_key;
    }
}

#[derive(Debug)]
pub enum BookingError {
    AlreadyInitialized(Address),
    InvalidRange(U256, U256),
    SlotExpired(U256, U256),
    DoubleBooking(Address, U256, U256),
    NotAdmin(Address),
    MintFailed,
}

impl From<BookingError> for String {
    fn from(err: BookingError) -> Self {
        match err {
            BookingError::AlreadyInitialized(_admin) => "Already initialized".to_string(),
            BookingError::InvalidRange(_, _) => "Invalid range".to_string(),
            BookingError::SlotExpired(_, _) => "Slot expired".to_string(),
            BookingError::DoubleBooking(_, _, _) => "Double booking".to_string(),
            BookingError::NotAdmin(_) => "Not admin".to_string(),
            BookingError::MintFailed => "Mint failed".to_string(),
        }
    }
}

#[public]
impl TimeMint {
    pub fn init(&mut self, admin: Address) -> Result<(), String> {
        if self.admin_key.get() != [0u8; 32] {
            return Err("Already initialized".to_string());
        }
        let mut padded = [0u8; 32];
        padded[..20].copy_from_slice(admin.as_slice());
        self.admin_key.set(padded.into());
        Ok(())
    }

    /// Register a site creator for a given site_id. Can only be set once per site_id.
    pub fn register_site(&mut self, site_id: String, creator: Address) -> Result<(), String> {
        let mut arr = [0u8; 32];
        let bytes = site_id.as_bytes();
        let len = bytes.len().min(32);
        arr[..len].copy_from_slice(&bytes[..len]);
        let site_id_key = FixedBytes::<32>::from(arr);
        let existing = self.site_creators.get(site_id_key);
        if existing != Address::ZERO {
            return Err("Creator already set for this site_id".to_string());
        }
        let caller = self.vm().msg_sender();
        if caller != creator {
            return Err("Only the creator can register their own site".to_string());
        }
        self.site_creators.setter(site_id_key).set(creator);
        Ok(())
    }

    /// Set the global booking fee (admin only)
    pub fn set_booking_fee(&mut self, new_fee: U256) -> Result<(), String> {
        let caller = self.vm().msg_sender();
        let admin_bytes = self.admin_key.get();
        let admin_addr = Address::from_slice(&admin_bytes[..20]);
        if caller != admin_addr {
            return Err("Only admin can set booking fee".to_string());
        }
        self.booking_fee.set(new_fee);
        Ok(())
    }

    /// Book a slot for a given site_id. Fee is split between creator and admin.
    pub fn book_slot(&mut self, site_id: String, start: U256, end: U256) -> Result<U256, String> {
        let mut arr = [0u8; 32];
        let bytes = site_id.as_bytes();
        let len = bytes.len().min(32);
        arr[..len].copy_from_slice(&bytes[..len]);
        let site_id_key = FixedBytes::<32>::from(arr);
        if start == U256::ZERO || end == U256::ZERO || end <= start {
            return Err("Invalid slot time range".to_string());
        }
        let creator = self.site_creators.get(site_id_key);
        if creator == Address::ZERO {
            return Err("No creator registered for this site_id".to_string());
        }
        let caller = self.vm().msg_sender();
        let fee = self.booking_fee.get();
        let sent = self.vm().msg_value();
        if sent < fee {
            return Err("Insufficient booking fee".to_string());
        }
        let creator_share = fee * U256::from(95u8) / U256::from(100u8);
        let admin_share = fee - creator_share;
        let creator_balance = self.user_balances.get(creator);
        self.user_balances.setter(creator).set(creator_balance + creator_share);
        let admin_bytes = self.admin_key.get();
        let admin_addr = Address::from_slice(&admin_bytes[..20]);
        let admin_balance = self.user_balances.get(admin_addr);
        self.user_balances.setter(admin_addr).set(admin_balance + admin_share);
        let token_id = self.erc721.total_supply.get();
        self.erc721.total_supply.set(token_id + U256::from(1));
        Ok(token_id)
    }

    /// Withdraw accumulated balance (for creators and admin)
    pub fn withdraw(&mut self) -> Result<(), String> {
        let caller = self.vm().msg_sender();
        let amount = self.user_balances.get(caller);
        if amount == U256::ZERO {
            return Err("No balance to withdraw".to_string());
        }
        self.user_balances.setter(caller).set(U256::ZERO);
        self.vm().transfer_eth(caller, amount).map_err(|_| "Transfer failed".to_string())?;
        Ok(())
    }

    pub fn slots_of_creator(&self, creator: Address) -> Vec<U256> {
        let count = self.creator_count.get(creator);
        let mut slots = Vec::new();
        let count_limbs = count.as_limbs();
        let count_val = if !count_limbs.is_empty() { count_limbs[0] } else { 0 };
        for i in 0..count_val {
            let token_id = self.creator_slots.getter(creator).get(U256::from(i));
            if token_id == U256::ZERO {
                continue;
            }
            slots.push(token_id);
        }
        slots
    }

    pub fn slots_of_owner(&self, owner: Address) -> Vec<U256> {
        let count = self.owner_count.get(owner);
        let mut slots = Vec::new();
        let count_limbs = count.as_limbs();
        let count_val = if !count_limbs.is_empty() { count_limbs[0] } else { 0 };
        for i in 0..count_val {
            let token_id = self.owner_slots.getter(owner).get(U256::from(i));
            if token_id == U256::ZERO {
                continue;
            }
            slots.push(token_id);
        }
        slots
    }

    pub fn slot_metadata(&self, token_id: U256) -> (Address, U256, U256) {
        let creator = self.creators.get(token_id);
        let start = self.slot_start.get(token_id);
        let end = self.slot_end.get(token_id);
        if creator == Address::ZERO || start == U256::ZERO || end == U256::ZERO {
            (Address::ZERO, U256::ZERO, U256::ZERO)
        } else {
            (creator, start, end)
        }
    }

    pub fn on_erc721_received(&mut self, _operator: Address, _from: Address, _token_id: U256, _data: Vec<u8>) -> [u8; 4] {
        [0x15, 0x0b, 0x7a, 0x02]
    }

    pub fn debug_owner_info(&self, owner: Address) -> Vec<U256> {
        let count = self.owner_count.get(owner);
        let mut slots = Vec::new();
        let count_limbs = count.as_limbs();
        let count_val = if !count_limbs.is_empty() { count_limbs[0] } else { 0 };
        for i in 0..count_val {
            let token_id = self.owner_slots.getter(owner).get(U256::from(i));
            slots.push(token_id);
        }
        slots
    }
}