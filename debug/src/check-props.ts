const ReactPropTypesSecret = 'SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED';

let loggedTypeFailures: Record<string, boolean> = {};

/**
 * Reset the history of which prop type warnings have been logged.
 */
export function resetPropWarnings(): void {
	loggedTypeFailures = {};
}

/**
 * Assert that the values match with the type specs.
 * Error messages are memorized and will only be shown once.
 *
 * Adapted from https://github.com/facebook/prop-types/blob/master/checkPropTypes.js
 */
export function checkPropTypes(
	typeSpecs: Record<string, (...args: any[]) => Error | null | undefined>,
	values: Record<string, any>,
	location: string,
	componentName: string,
	getStack?: () => string
): void {
	Object.keys(typeSpecs).forEach(typeSpecName => {
		let error: Error | null | undefined;
		try {
			error = typeSpecs[typeSpecName](
				values,
				typeSpecName,
				componentName,
				location,
				null,
				ReactPropTypesSecret
			);
		} catch (e) {
			error = e as Error;
		}
		if (error && !(error.message in loggedTypeFailures)) {
			loggedTypeFailures[error.message] = true;
			console.error(
				`Failed ${location} type: ${error.message}${
					(getStack && `\n${getStack()}`) || ''
				}`
			);
		}
	});
}
