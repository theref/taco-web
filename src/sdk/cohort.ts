import { PublicKey } from '@nucypher/nucypher-core';
import { ChecksumAddress } from '../types';
import { Porter } from '../characters/porter';

export type Ursula = {
    readonly checksumAddress: ChecksumAddress;
    readonly uri: string;
    readonly encryptingKey: PublicKey;
  };
interface CohortParameters {
    porterUri: string;
    threshold: number;
    shares?: number;
    include?: ChecksumAddress[];
    exclude?: ChecksumAddress[];
}

interface CohortJSON {
    ursulaAddresses: ChecksumAddress[];
    threshold: number;
    porterUri: string;
}

export class Cohort {
    constructor(
        public readonly ursulaAddresses: ChecksumAddress[],
        public readonly threshold: number,
        public readonly porterUri: string
    ) {
        this.ursulaAddresses = ursulaAddresses;
        this.threshold = threshold;
        this.porterUri = porterUri;
    }

    public static async create({
        porterUri,
        threshold,
        shares = 0,
        include = [],
        exclude = []
    }: CohortParameters) {
        if (shares == 0 && include.length == 0) {
            throw new TypeError('Shares is 0 and Include is an empty array');
        }
        if (shares == 0 && include.length > 0) {
            shares = include.length;
        }

        const porter = new Porter(porterUri);
        const ursulas = await porter.getUrsulas(
            shares,
            exclude,
            include);
        const ursulaAddresses = ursulas.map((ursula) => ursula.checksumAddress);
        return new Cohort(ursulaAddresses, threshold, porterUri);
    }
  
    public static fromJson({ursulaAddresses, threshold, porterUri}: CohortJSON) {
        return new Cohort(ursulaAddresses, threshold, porterUri);
    }

    public toJson() {
        const config = {
            ursulaAddresses: this.ursulaAddresses,
            threshold: this.threshold,
            porterUri: this.porterUri
        }
        return config
    }

}