export async function handle(state, action) {
  const input = action.input;

  const contractAdmin = state.contractAdmin;
  const participants = state.participants;
  const signatures = state.signatures;
  const winners = state.winners;
  const maxIndexLimit = participants?.length - 1;

  const ERROR_SOMETHING_WENT_WRONG = `ERROR_GENETRATING_RANDOM_INTEGER_FROM_RANDOM_DOT_ORG`;
  const ERROR_INVALID_CALLER = `ERROR_ONLY_CONTRACT_ADMIN_CAN_CALL_THIS_FUNCTION`;
  const ERROR_SIGNATURE_ALREADY_USED = `ERROR_ADMIN_SIGNATURE_REUSAGE`;
  const ERROR_INVALID_CALLER_SIGNATURE = `ERROR_INVALID_ADMIN_SIGNATURE`;

  if (input.function === "draw") {
    const jwk_n = input.jwk_n;
    const sig = input.sig;

    await _verifyArSignature(jwk_n, sig);
    const drawId = SmartWeave.transaction.id;
    const luckyNumberIndex = await _generateRandomNumber();

    winners.push({
      address: participants[luckyNumberIndex],
      luckyNumber: luckyNumberIndex,
      draw_id: drawId,
      signature: sig,
    });

    return { state };
  }

  async function _generateRandomNumber() {
    try {
      const req = await EXM.deterministicFetch(
        `https://www.random.org/integers/?num=1&min=0&max=${maxIndexLimit}&col=1&base=10&format=plain`
      );
      const res = Number(req?.asText());
      return res;
    } catch (error) {
      throw new ContractError(ERROR_SOMETHING_WENT_WRONG);
    }
  }

  async function _verifyArSignature(owner, signature) {
    try {
      ContractAssert(owner === contractAdmin, ERROR_INVALID_CALLER);
      ContractAssert(
        !state.signatures.includes(signature),
        ERROR_SIGNATURE_ALREADY_USED
      );

      const encodedMessage = new TextEncoder().encode(
        `ARK NFT LUCKY DRAW: ${owner}`
      );
      const typedArraySig = Uint8Array.from(atob(signature), (c) =>
        c.charCodeAt(0)
      );
      const isValid = await SmartWeave.arweave.crypto.verify(
        owner,
        encodedMessage,
        typedArraySig
      );

      ContractAssert(isValid, ERROR_INVALID_CALLER_SIGNATURE);

      state.signatures.push(signature);
    } catch (error) {
      throw new ContractError(ERROR_INVALID_CALLER_SIGNATURE);
    }
  }
}
