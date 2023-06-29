import { toInternalModule } from './move-types.js'
import { SuiNetwork } from './network.js'
import {
  InternalMoveModule,
  InternalMoveStruct,
  ChainAdapter,
  moduleQname,
  SPLITTER,
  TypeDescriptor,
} from '@typemove/move'
import {
  Connection,
  JsonRpcProvider,
  SuiMoveNormalizedModule,
  SuiEvent,
  SuiMoveObject,
  SuiParsedData,
} from '@mysten/sui.js'

export class SuiChainAdapter extends ChainAdapter<
  SuiNetwork,
  SuiMoveNormalizedModule,
  SuiEvent | SuiMoveObject
> {
  static INSTANCE = new SuiChainAdapter()

  async fetchModule(
    account: string,
    module: string,
    network: SuiNetwork
  ): Promise<SuiMoveNormalizedModule> {
    const client = getRpcClient(network)
    return await client.getNormalizedMoveModule({ package: account, module })
  }

  async fetchModules(
    account: string,
    network: SuiNetwork
  ): Promise<SuiMoveNormalizedModule[]> {
    const client = getRpcClient(network)
    const modules = await client.getNormalizedMoveModulesByPackage({
      package: account,
    })
    return Object.values(modules)
  }

  getMeaningfulFunctionParams(params: TypeDescriptor[]): TypeDescriptor[] {
    return params
    // if (params.length === 0) {
    //   return params
    // }
    // return params.slice(0, params.length - 1)
  }

  toInternalModules(modules: SuiMoveNormalizedModule[]): InternalMoveModule[] {
    return Object.values(modules).map(toInternalModule)
  }

  getAllEventStructs(
    modules: InternalMoveModule[]
  ): Map<string, InternalMoveStruct> {
    const eventMap = new Map<string, InternalMoveStruct>()

    for (const module of modules) {
      const qname = moduleQname(module)

      for (const struct of module.structs) {
        const abilities = new Set(struct.abilities)
        if (abilities.has('Drop') && abilities.has('Copy')) {
          eventMap.set(qname + SPLITTER + struct.name, struct)
        }
      }
    }
    return eventMap
  }

  getType(base: SuiEvent | SuiMoveObject): string {
    return base.type
  }

  getData(val: SuiEvent | SuiMoveObject) {
    if (SuiEvent.is(val)) {
      return val.parsedJson as any
    }
    if (SuiParsedData.is(val)) {
      return val.fields as any
    }
    // if (SuiMoveObject.is(val)) {
    //   return val.fields as any
    // }
    // This may not be perfect, just think everything has
    if ('fields' in val) {
      if ('type' in val && Object.keys(val).length === 2) {
        return val.fields as any
      }
    }
    return val as any
  }
  // validateAndNormalizeAddress(address: string) {
  //   return validateAndNormalizeAddress(address)
  // }
}

function getRpcEndpoint(network: SuiNetwork): string {
  switch (network) {
    case SuiNetwork.TEST_NET:
      return 'https://fullnode.testnet.sui.io/'
  }
  return 'https://fullnode.mainnet.sui.io/'
}

function getRpcClient(network: SuiNetwork): JsonRpcProvider {
  return new JsonRpcProvider(
    new Connection({ fullnode: getRpcEndpoint(network) })
  )
}
