import { conditions } from '@nucypher/taco';
import { useEthers } from '@usedapp/core';
import React, { useState } from 'react';

interface Props {
  condition?: conditions.Condition | undefined;
  setConditions: (value: conditions.Condition) => void;
  enabled: boolean;
}

// Build NFT ownership conditions with taco-pdk:
// https://github.com/nucypher/taco-pdk
//
// Example Rust condition checking ERC721 ownership:
//   use taco_pdk::prelude::*;
//   #[plugin_fn]
//   pub fn evaluate(_: ()) -> FnResult<Vec<u8>> {
//       let owner = context_string(":userAddress")?;
//       let contract = context_string(":contractAddress")?;
//       let chain_id = context_string(":chainId")?;
//       // ... call read_chain to check NFT balance ...
//   }

export const NFTConditionBuilder = ({
  condition,
  setConditions,
  enabled,
}: Props) => {
  const { library } = useEthers();
  const [wasmBase64, setWasmBase64] = useState('AGFzbQEAAAA=');
  const [name, setName] = useState('nft-ownership');

  if (!enabled || !library) {
    return <></>;
  }

  const makeInput = (
    onChange = (e: any) => console.log(e),
    defaultValue?: string | number,
  ) => (
    <input
      type="string"
      onChange={(e: any) => onChange(e.target.value)}
      defaultValue={defaultValue}
    />
  );

  const wasmInput = makeInput(setWasmBase64, 'AGFzbQEAAAA=');
  const nameInput = makeInput(setName, 'nft-ownership');

  const onCreateCondition = (e: any) => {
    e.preventDefault();
    setConditions(
      new conditions.Condition({
        wasm: wasmBase64,
        name,
        inputs: [':userAddress'],
      }),
    );
  };

  const prettyPrint = (obj: object | string) => {
    if (typeof obj === 'string') {
      obj = JSON.parse(obj);
    }
    return JSON.stringify(obj, null, 2);
  };

  return (
    <>
      <h2>Step 1 - Create A Conditioned Access Policy</h2>
      <div>
        <div>
          <h3>Build your WASM Condition</h3>
          <div>
            <p>
              Build conditions with{' '}
              <a href="https://github.com/nucypher/taco-pdk">taco-pdk</a>
            </p>
          </div>
          <div>
            <p>WASM Bytecode (base64) {wasmInput}</p>
            <p>Condition Name {nameInput}</p>
          </div>
          <button onClick={onCreateCondition}>Create Conditions</button>
        </div>
        {condition && (
          <div>
            <h3>Condition JSON:</h3>
            <textarea
              readOnly={true}
              disabled={true}
              rows={15}
              value={prettyPrint(condition?.toObj() ?? {})}
            />
          </div>
        )}
      </div>
    </>
  );
};
