<div id="divChangelog">
	<h3>2016-nov-21<br>v2.0</h3>
	<ul>
		<li>Added functionality to specify Role ARN's in the options panel. This is meant for cross-account assume-role API calls. For each specified role temporary credentials will be fetched and added to the credentials file.</li>
		<li>Updated 'AWS SDK for Javascript' library to latest version</li>
		<li>Plugin now shows changelog to the user after the installation of new version</li>
		<li>Options panel has a new look to improve readability</li>
	</ul>
	<br />
	<br />

	<h3>2016-jul-24<br>v1.2</h3>
	<ul>
		<li>Bug fix: when just 1 role in the SAML Assertion available now also works well</li>
		<li>Now uses a regex to extract Role and Principal from SAML Assertion. This way it does not matter in what order the IDP adds the Role and Principle to the SAML Assertion.</li>
	</ul>
	<br />
	<br />

	<h3>2016-apr-11<br>v1.1</h3>
	<ul>
		<li>Improved usability. No longer needed to manually specify PrincipalArn and RoleArn in options panel. Removed these options from the options panel. PrincipalArn and RoleArn is now parsed from the SAML Assertion itself.</li>
	</ul>
	<br />
	<br />

	<h3>2016-apr-04<br>v1.0</h3>
	<ul>
		<li>Initial release</li>
	</ul>		
</div>